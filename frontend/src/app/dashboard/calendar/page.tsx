'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  // TODO: In production, check if user has connected calendar via API
  const [isConnected, setIsConnected] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Load calendar connection status from API
    // const checkConnection = async () => {
    //   try {
    //     const token = localStorage.getItem('token');
    //     const response = await fetch(`${API_URL}/calendar/status`, {
    //       headers: { 'Authorization': `Bearer ${token}` }
    //     });
    //     if (response.ok) {
    //       const data = await response.json();
    //       setIsConnected(data.google.connected || data.outlook.connected);
    //     }
    //   } catch (error) {
    //     console.error('Error checking calendar connection:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // checkConnection();
    
    // For now, just set loading to false
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        </div>
        
        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
              <CalendarIcon className="w-10 h-10 text-indigo-600" />
            </div>
            
            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Kein Kalender verbunden</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Verbinden Sie Ihren Google oder Outlook Kalender, um Termine zu verwalten und Jarvis die automatische Buchung zu ermöglichen.
              </p>
            </div>
            
            {/* Features */}
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3 h-3 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Automatische Terminbuchung</div>
                  <div className="text-xs text-gray-500">Jarvis bucht Besichtigungen direkt in deinen Kalender</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Team-Synchronisation</div>
                  <div className="text-xs text-gray-500">Alle Termine werden mit deinem Team geteilt</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Standort-Integration</div>
                  <div className="text-xs text-gray-500">Adressen werden automatisch hinzugefügt</div>
                </div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="pt-6">
              <Link 
                href="/dashboard/settings/integrations"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full"
              >
                Kalender verbinden
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connected View
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        
        <div className="flex items-center gap-3">
          {/* Team Avatars */}
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-xs font-medium text-white shadow-sm" 
                title={`Mitarbeiter ${i}`}
              >
                M{i}
              </div>
            ))}
            <button className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm">
              <Users className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
          
          {/* New Event Button */}
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Neuer Termin
          </button>
        </div>
      </div>
      
      {/* Calendar Navigation */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="px-4 text-base font-semibold text-gray-900 min-w-[140px] text-center">
            Januar 2026
          </span>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* View Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button className="px-3 py-1.5 text-xs font-medium text-gray-900 bg-white rounded-md shadow-sm">
            Woche
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Monat
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Tag
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-full p-6">
          <div className="grid grid-cols-8 gap-4">
            {/* Time Column */}
            <div className="col-span-1 space-y-16 pt-10 text-xs text-gray-400 text-right">
              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
                <div key={time} className="relative">
                  <span className="absolute -top-2 right-0">{time}</span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {['Mo 26', 'Di 27', 'Mi 28', 'Do 29', 'Fr 30', 'Sa 31', 'So 01'].map((day, i) => (
              <div key={day} className="col-span-1 relative min-h-[600px]">
                {/* Day Header */}
                <div className="text-center pb-4 mb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <div className="text-xs font-medium text-gray-500">{day.split(' ')[0]}</div>
                  <div className={`text-lg font-semibold mt-1 ${i === 1 ? 'text-indigo-600' : 'text-gray-900'}`}>
                    {day.split(' ')[1]}
                  </div>
                </div>
                
                {/* Hour Grid Lines */}
                <div className="absolute inset-0 top-16 space-y-16 pointer-events-none">
                  {[...Array(9)].map((_, j) => (
                    <div key={j} className="border-t border-gray-50"></div>
                  ))}
                </div>

                {/* Mock Events */}
                {i === 1 && (
                  <div className="absolute top-28 left-0 right-0 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="w-1 h-full bg-indigo-500 rounded-full absolute left-0 top-0 bottom-0"></div>
                      <div className="pl-3 flex-1">
                        <div className="text-sm font-semibold text-indigo-900 group-hover:text-indigo-700">Besichtigung</div>
                        <div className="text-xs text-indigo-600 mt-0.5">10:00 - 11:00</div>
                        <div className="text-xs text-indigo-500 mt-1.5 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Max Mustermann
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {i === 3 && (
                  <div className="absolute top-52 left-0 right-0 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="w-1 h-full bg-green-500 rounded-full absolute left-0 top-0 bottom-0"></div>
                      <div className="pl-3 flex-1">
                        <div className="text-sm font-semibold text-green-900 group-hover:text-green-700">Notartermin</div>
                        <div className="text-xs text-green-600 mt-0.5">12:00 - 13:30</div>
                        <div className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Hauptstraße 123
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
