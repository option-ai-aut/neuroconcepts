'use client';

import { useState } from 'react';
import { User, Mail, Plus, Trash2, Shield, Eye, EyeOff, Key } from 'lucide-react';
import { getMe, getSeats, inviteSeat } from '@/lib/api';
import useSWR from 'swr';

export default function ProfileSettingsPage() {
  const { data: user } = useSWR('/me', getMe);
  const { data: seats = [], mutate: mutateSeats } = useSWR('/seats', getSeats);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newSeatEmail, setNewSeatEmail] = useState('');
  const [newSeatRole, setNewSeatRole] = useState('AGENT');
  
  // Profile edit state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Initialize form when user loads
  useState(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setStreet(user.street || '');
      setCity(user.city || '');
      setPostalCode(user.postalCode || '');
      setCountry(user.country || '');
    }
  });

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
      alert('Löschen noch nicht implementiert');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          street,
          postalCode,
          city,
          country
        })
      });

      if (response.ok) {
        mutate(); // Refresh user data
        setIsEditingProfile(false);
        alert('Profil erfolgreich gespeichert!');
      } else {
        const error = await response.json();
        alert('Fehler beim Speichern: ' + (error.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Fehler beim Speichern des Profils');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwörter stimmen nicht überein!');
      return;
    }
    if (newPassword.length < 8) {
      alert('Passwort muss mindestens 8 Zeichen lang sein!');
      return;
    }
    // TODO: Implement password change API
    alert('Passwort geändert!');
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input 
                  type="text" 
                  value={firstName || user.firstName || ''} 
                  onChange={(e) => { setFirstName(e.target.value); setIsEditingProfile(true); }}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input 
                  type="text" 
                  value={lastName || user.lastName || ''} 
                  onChange={(e) => { setLastName(e.target.value); setIsEditingProfile(true); }}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Adresse</label>
                <input 
                  type="email" 
                  value={email || user.email || ''} 
                  onChange={(e) => { setEmail(e.target.value); setIsEditingProfile(true); }}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
                <input 
                  type="tel" 
                  value={phone || user.phone || ''} 
                  onChange={(e) => { setPhone(e.target.value); setIsEditingProfile(true); }}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Adresse</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Straße & Hausnummer</label>
                  <input 
                    type="text" 
                    value={street || user.street || ''} 
                    onChange={(e) => { setStreet(e.target.value); setIsEditingProfile(true); }}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                    <input 
                      type="text" 
                      value={postalCode || user.postalCode || ''} 
                      onChange={(e) => { setPostalCode(e.target.value); setIsEditingProfile(true); }}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                    <input 
                      type="text" 
                      value={city || user.city || ''} 
                      onChange={(e) => { setCity(e.target.value); setIsEditingProfile(true); }}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                  <select 
                    value={country || user.country || ''} 
                    onChange={(e) => { setCountry(e.target.value); setIsEditingProfile(true); }}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Bitte wählen</option>
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setIsChangingPassword(true)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Passwort ändern
            </button>
            {isEditingProfile && (
              <button 
                onClick={handleSaveProfile}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Speichern
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Passwort ändern</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aktuelles Passwort</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mindestens 8 Zeichen</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Passwort ändern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select 
                value={newSeatRole}
                onChange={(e) => setNewSeatRole(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">Abbrechen</button>
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
                      className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded-lg"
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
