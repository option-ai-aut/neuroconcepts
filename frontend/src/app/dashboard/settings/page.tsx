'use client';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Einstellungen</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Firmendaten</h2>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Firmenname</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-Mail Signatur</label>
            <textarea className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={4} />
          </div>
        </div>
        <div className="mt-6">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
