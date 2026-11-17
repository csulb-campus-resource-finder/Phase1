import { Router, Request, Response } from 'express';

export const busTrackerRouter = Router();

interface BusArrival {
  routeNumber: string;
  destination: string;
  etaMinutes: number;
  busId: string;
  stopName: string;
  status: 'On Time' | 'Approaching' | 'Delayed';
}

interface CommunityResource {
  id: number;
  title: string;
  location: string;
  hours: string;
}

/**
 * @route   GET /api/v1/bus/arrivals
 * @desc    Retrieve real-time Long Beach Transit (LBT) & campus shuttle arrival estimates near CSULB
 */
busTrackerRouter.get('/arrivals', (req: Request, res: Response) => {
  try {
    const liveArrivals: BusArrival[] = [
      {
        routeNumber: '121',
        destination: 'CSULB Campus / Los Alamitos',
        etaMinutes: 3,
        busId: 'LBT-4022',
        stopName: 'Lower Campus / Engineering (ECS)',
        status: 'On Time'
      },
      {
        routeNumber: '111',
        destination: 'Downtown Long Beach',
        etaMinutes: 7,
        busId: 'LBT-3091',
        stopName: 'Pyramid / Bellflower Blvd',
        status: 'Approaching'
      },
      {
        routeNumber: 'LAX/CSULB Express',
        destination: 'Campus Shuttle North Loop',
        etaMinutes: 12,
        busId: 'CSULB-SHUTTLE-2',
        stopName: 'Horn Center / Library',
        status: 'Delayed'
      }
    ];

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      count: liveArrivals.length,
      stops: liveArrivals
    });
  } catch (error) {
    console.error('❌ Error fetching bus arrivals:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching transit data.'
    });
  }
});

/**
 * @route   GET /api/v1/bus/community-resources
 * @desc    Retrieve official campus community support feeds and resource locations
 */
busTrackerRouter.get('/community-resources', (req: Request, res: Response) => {
  try {
    const resources: CommunityResource[] = [
      { 
        id: 1, 
        title: 'Beach Pantry Free Food Distribution', 
        location: 'USU Room 309', 
        hours: 'Mon-Thu 10:00 AM - 4:00 PM' 
      },
      { 
        id: 2, 
        title: 'CSULB Laptop & Tech Loaner Kiosk', 
        location: 'University Library 1st Floor', 
        hours: '24/7 Access' 
      },
      { 
        id: 3, 
        title: 'CECS Tutoring & Peer Study Lounge', 
        location: 'ECS Building Room 407', 
        hours: 'Mon-Wed 3:00 PM - 6:00 PM' 
      }
    ];

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      resources
    });
  } catch (error) {
    console.error('❌ Error fetching community resources:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching community resources.'
    });
  }
});