import React, { useState } from 'react';

interface ICSClassItem {
  course_code: string;
  start_time: string;
  end_time: string;
  day: string;
  location: string;
}

export const ICSUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [classes, setClasses] = useState<ICSClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v1/schedule/upload-ics', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to parse .ics file.');
      }

      const data: ICSClassItem[] = await response.json();
      setClasses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Calendar File (.ics)</h2>
      <p className="text-sm text-gray-600 mb-4">
        Select your exported calendar file to instantly sync your class times and locations.
      </p>

      <input
        type="file"
        accept=".ics"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 mb-4 cursor-pointer"
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full py-2.5 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
      >
        {loading ? 'Parsing .ics File...' : 'Upload & Sync .ics File'}
      </button>

      {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}

      {classes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-bold text-gray-800 mb-3">Synced Classes from Calendar:</h3>
          <ul className="space-y-2">
            {classes.map((cls, idx) => (
              <li key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                <p className="font-semibold text-yellow-800">{cls.course_code}</p>
                <p className="text-gray-600">{cls.day}: {cls.start_time} - {cls.end_time}</p>
                <p className="text-xs text-gray-500">{cls.location}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
