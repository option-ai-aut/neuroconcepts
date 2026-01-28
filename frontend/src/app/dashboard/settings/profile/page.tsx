'use client';

import { useState } from 'react';
import { User, Mail, Plus, Trash2, Shield } from 'lucide-react';
import { getMe, getSeats, inviteSeat } from '@/lib/api';
import useSWR from 'swr';

export default function ProfileSettingsPage() {
  const { data: user } = useSWR('/me', getMe);
  const { data: seats = [], mutate: mutateSeats } = useSWR('/seats', getSeats);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newSeatEmail, setNewSeatEmail] = useState('');
  const [newSeatRole, setNewSeatRole] = useState('AGENT');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteSeat(newSeatEmail, newSeatRole);
      setNewSeatEmail('');
      setIsInviteOpen(false);
      mutateSeats();
      alert('Einladung gesendet!');
    } catch (error) {
      alert('Fehler beim Einladen: ' + error);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Möchten Sie diesen Nutzer wirklich entfernen?')) {
      // TODO: Implement delete API
      // setSeats(seats.filter(s => s.id !== id));
      alert('Löschen noch nicht implementiert');
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Laden...</div>;

  return (
    <div className="space-y-10">
      {/* Personal Profile */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Mein Profil</h2>
        <p className="text-sm text-gray-500 mb-6">
          Ihre persönlichen Einstellungen und Login-Daten.
        </p>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl font-bold">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
                {user.role}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
              <input type="text" defaultValue={user.firstName || ''} className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
              <input type="text" defaultValue={user.lastName || ''} className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Passwort ändern
            </button>
            <button className="ml-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Speichern
            </button>
          </div>
        </div>
      </div>

      {/* Team Management (Seats) */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Team & Seats</h2>
            <p className="text-sm text-gray-500">
              Verwalten Sie Zugänge für Ihre Mitarbeiter. Jeder Seat hat seinen eigenen Login.
            </p>
          </div>
          <button 
            onClick={() => setIsInviteOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Mitarbeiter einladen
          </button>
        </div>

        {isInviteOpen && (
          <form onSubmit={handleInvite} className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-end gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Adresse des Mitarbeiters</label>
              <input 
                type="email" 
                required
                placeholder="mitarbeiter@firma.de"
                value={newSeatEmail}
                onChange={(e) => setNewSeatEmail(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm" 
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select 
                value={newSeatRole}
                onChange={(e) => setNewSeatRole(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900">Abbrechen</button>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">Einladen</button>
            </div>
          </form>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktion</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {seats.map((seat: any) => (
                <tr key={seat.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium text-xs mr-3">
                        {seat.firstName?.charAt(0) || seat.email.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{seat.firstName} {seat.lastName}</div>
                        <div className="text-sm text-gray-500">{seat.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <Shield className="w-3 h-3 mr-1" />
                      {seat.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      seat.firstName === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {seat.firstName === 'Pending' ? 'Eingeladen' : 'Aktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDelete(seat.id)}
                      className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
