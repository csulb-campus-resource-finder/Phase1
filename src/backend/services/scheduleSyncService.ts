import * as cheerio from 'cheerio';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const ScheduleSyncService = {
  async syncCatalogFromCSULB() {
    try {
      const targetUrl = 'https://web.csulb.edu/depts/enrollment/registration/class_schedule/Fall_2026/By_Subject/CECS.html';
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSULB catalog: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const scrapedCourses: Array<{
        code: string;
        name: string;
        days: string[];
        startTime: string;
        endTime: string;
        building: string;
        room: string;
      }> = [];

      // Parse university course table rows (adjust CSS selectors based on university markup structure)
      $('tr.classRow, tr').each((_, element) => {
        const code = $(element).find('.courseCode, td:nth-child(1)').text().trim();
        const name = $(element).find('.courseTitle, td:nth-child(2)').text().trim();
        const daysRaw = $(element).find('.days, td:nth-child(4)').text().trim(); // e.g., "Tue, Thu"
        const timeRaw = $(element).find('.time, td:nth-child(5)').text().trim();   // e.g., "09:30 - 10:45"
        const locationRaw = $(element).find('.location, td:nth-child(6)').text().trim(); // e.g., "ECS 311"

        if (code && timeRaw) {
          const days = daysRaw ? daysRaw.split(',').map(d => d.trim()) : ['Tue', 'Thu'];
          const [startTime = '09:30', endTime = '10:45'] = timeRaw.split('-').map(t => t.trim());
          const [building = 'ECS', room = '311'] = locationRaw.split(' ');
          
          scrapedCourses.push({ code, name: name || 'CSULB Course', days, startTime, endTime, building, room });
        }
      });

      if (scrapedCourses.length === 0) {
        console.warn('Scraper found 0 courses, check HTML selectors or network restrictions.');
        return { success: false, count: 0 };
      }

      // Upsert parsed courses into PostgreSQL / NeonDB
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const course of scrapedCourses) {
          await client.query(
            `INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (course_code) DO UPDATE 
             SET course_name = EXCLUDED.course_name, days = EXCLUDED.days, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, building = EXCLUDED.building, room = EXCLUDED.room, updated_at = NOW();`,
            [course.code, course.name, course.days, course.startTime, course.endTime, course.building, course.room]
          );
        }
        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }

      return { success: true, count: scrapedCourses.length };
    } catch (error: any) {
      console.error('Schedule synchronization error:', error.message);
      return { success: false, error: error.message };
    }
  }
};