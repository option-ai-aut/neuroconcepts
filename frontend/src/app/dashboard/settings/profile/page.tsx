'use client';

import { useState } from 'react';
import { User, Mail, Plus, Trash2, Shield, Eye, EyeOff, Key, Loader2, Download, AlertTriangle } from 'lucide-react';
import { getMe, getSeats, inviteSeat, deleteSeat, getAuthHeaders } from '@/lib/api';
import { getRuntimeConfig } from '@/components/EnvProvider';
import { updatePassword, signOut, fetchAuthSession } from 'aws-amplify/auth';
import useSWR from 'swr';

export default function ProfileSettingsPage() {
  const { data: user, mutate: mutateUser } = useSWR('/me', getMe);
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

  const handleDelete = async (id: string) => {
    if (confirm('Möchten Sie diesen Nutzer wirklich entfernen?')) {
      try {
        await deleteSeat(id);
        mutateSeats();
        alert('Nutzer erfolgreich entfernt!');
      } catch (error: any) {
        alert('Fehler beim Entfernen: ' + (error.message || 'Unbekannter Fehler'));
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/me`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
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
        mutateUser(); // Refresh user data
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

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Data export & deletion state
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/account/export`, {
        headers: authHeaders as Record<string, string>,
      });
      if (!response.ok) throw new Error('Export fehlgeschlagen');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `immivo-datenexport-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Fehler beim Datenexport. Bitte versuchen Sie es erneut.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'LÖSCHEN') return;
    setIsDeleting(true);
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/account`, {
        method: 'DELETE',
        headers: authHeaders as Record<string, string>,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Löschung fehlgeschlagen');
      }
      
      // Sign out and redirect
      await signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'Fehler beim Löschen des Kontos.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein!');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein!');
      return;
    }
    
    setChangingPassword(true);
    try {
      // Ensure we have a fresh session before changing password
      await fetchAuthSession({ forceRefresh: true });
      
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword
      });
      
      // Force sign out so user must re-login with new password
      // This ensures the new password is definitely active
      await signOut();
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.name === 'NotAuthorizedException') {
        setPasswordError('Das aktuelle Passwort ist falsch.');
      } else if (error.name === 'InvalidPasswordException') {
        setPasswordError('Das neue Passwort erfüllt nicht die Anforderungen (mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahlen).');
      } else if (error.name === 'LimitExceededException') {
        setPasswordError('Zu viele Versuche. Bitte warte einen Moment.');
      } else {
        // Strip "Password does not conform to policy: " prefix
        const cleanMsg = (error.message || '').replace(/^Password does not conform to policy:\s*/i, '');
        setPasswordError(cleanMsg || 'Fehler beim Ändern des Passworts.');
      }
      setChangingPassword(false);
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
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 text-xl font-bold">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                user.role === 'ADMIN' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : user.role === 'AGENT' ? 'Agent' : user.role}
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
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input 
                  type="text" 
                  value={lastName || user.lastName || ''} 
                  onChange={(e) => { setLastName(e.target.value); setIsEditingProfile(true); }}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
                <input 
                  type="tel" 
                  value={phone || user.phone || ''} 
                  onChange={(e) => { setPhone(e.target.value); setIsEditingProfile(true); }}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                    <input 
                      type="text" 
                      value={postalCode || user.postalCode || ''} 
                      onChange={(e) => { setPostalCode(e.target.value); setIsEditingProfile(true); }}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                    <input 
                      type="text" 
                      value={city || user.city || ''} 
                      onChange={(e) => { setCity(e.target.value); setIsEditingProfile(true); }}
                      className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                  <select 
                    value={country || user.country || ''} 
                    onChange={(e) => { setCountry(e.target.value); setIsEditingProfile(true); }}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
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
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aktuelles Passwort</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                    required
                    disabled={changingPassword}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
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
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    required
                    minLength={8}
                    disabled={changingPassword}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mind. 8 Zeichen, Groß-/Kleinbuchstaben und Zahlen</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  required
                  disabled={changingPassword}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
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
                    setPasswordError('');
                  }}
                  disabled={changingPassword}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit"
                  disabled={changingPassword}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {changingPassword ? 'Wird geändert...' : 'Passwort ändern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Management (Seats) - Only for Admins */}
      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
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
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center shadow-sm"
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
                className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select 
                value={newSeatRole}
                onChange={(e) => setNewSeatRole(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">Abbrechen</button>
              <button type="submit" className="bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800">Einladen</button>
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
              {seats.map((seat: any) => {
                const isPending = seat.firstName === 'Pending' || !seat.firstName;
                return (
                <tr key={seat.id} className={isPending ? 'bg-yellow-50/50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-medium text-xs mr-3 ${
                        isPending ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isPending ? '?' : (seat.firstName?.charAt(0) || seat.email.charAt(0))}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {isPending ? (
                            <span className="text-yellow-700 italic">Einladung ausstehend</span>
                          ) : (
                            `${seat.firstName} ${seat.lastName}`
                          )}
                        </div>
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
                      isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {isPending ? 'Eingeladen' : 'Aktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {seat.id !== user?.id && (
                      <button 
                        onClick={() => handleDelete(seat.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded-lg"
                        title={isPending ? 'Einladung zurückziehen' : 'Nutzer entfernen'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* DSGVO: Data Export & Account Deletion */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Datenschutz & Konto</h2>
        <p className="text-sm text-gray-500 mb-6">
          Gemäß DSGVO haben Sie das Recht auf Datenexport und Löschung Ihres Kontos.
        </p>
        
        <div className="space-y-4">
          {/* Data Export */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Meine Daten exportieren</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Alle Ihre gespeicherten Daten als JSON-Datei herunterladen (Art. 20 DSGVO).
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Exportiere...' : 'Daten exportieren'}
            </button>
          </div>

          {/* Account Deletion */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-900">Konto & Daten löschen</h3>
                <p className="text-xs text-red-700/70 mt-0.5">
                  Alle persönlichen Daten werden unwiderruflich gelöscht (Art. 17 DSGVO). 
                  Firmendaten (Leads, Objekte) bleiben im Tenant erhalten.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Konto löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Konto endgültig löschen?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Diese Aktion ist <strong>unwiderruflich</strong>. Folgende Daten werden gelöscht:
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4 pl-4 list-disc">
              <li>Ihr Benutzerkonto und Profildaten</li>
              <li>Chat-Verlauf mit Jarvis</li>
              <li>Benachrichtigungen und Einstellungen</li>
              <li>KI-Audit-Logs</li>
            </ul>
            <p className="text-sm text-gray-600 mb-3">
              Tippen Sie <strong>LÖSCHEN</strong> zur Bestätigung:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              className="block w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'LÖSCHEN' || isDeleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
