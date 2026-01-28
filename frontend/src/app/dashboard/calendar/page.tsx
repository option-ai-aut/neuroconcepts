'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  // Mock state: In production, check if user has connected calendar
  const [isConnected, setIsConnected] = useState(false); // Toggle this to test views
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-sm z-10">
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Kein Kalender verbunden</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">
              Verbinden Sie Ihren Google oder Outlook Kalender, um Termine zu verwalten und Jarvis die automatische Buchung zu ermöglichen.
            </p>
            <Link 
              href="/dashboard/settings/calendar"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors w-full"
            >
              Jetzt verbinden
            </Link>
            <button 
              onClick={() => setIsConnected(true)} 
              className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              (Demo: Als verbunden anzeigen)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected View
  return (
    <div className="h-full flex flex-col">
      {/* Header Toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm z-10 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button className="p-1 hover:bg-white rounded-md transition-colors shadow-sm text-gray-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-sm font-medium text-gray-700">Januar 2026</span>
            <button className="p-1 hover:bg-white rounded-md transition-colors shadow-sm text-gray-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2 mr-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600" title={`Mitarbeiter ${i}`}>
                M{i}
              </div>
            ))}
            <button className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-200">
              <Users className="w-3 h-3" />
            </button>
          </div>
          
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Termin
          </button>
        </div>
      </div>
      
      {/* Calendar Grid (Simplified Mock) */}
      <div className="flex-1 overflow-auto bg-white p-6">
        <div className="grid grid-cols-8 gap-4 h-full">
          {/* Time Column */}
          <div className="col-span-1 border-r border-gray-100 pr-4 space-y-12 pt-12 text-xs text-gray-400 text-right font-mono">
            <div>09:00</div>
            <div>10:00</div>
            <div>11:00</div>
            <div>12:00</div>
            <div>13:00</div>
            <div>14:00</div>
            <div>15:00</div>
            <div>16:00</div>
            <div>17:00</div>
          </div>

          {/* Days Columns */}
          {['Mo 26', 'Di 27', 'Mi 28', 'Do 29', 'Fr 30', 'Sa 31', 'So 01'].map((day, i) => (
            <div key={day} className="col-span-1 relative">
              <div className="text-center text-sm font-medium text-gray-500 mb-6 sticky top-0 bg-white py-2 border-b border-gray-50">
                {day}
              </div>
              
              {/* Grid Lines */}
              <div className="absolute inset-0 top-10 space-y-12 pointer-events-none">
                {[...Array(9)].map((_, j) => (
                  <div key={j} className="border-t border-gray-50 h-0 w-full"></div>
                ))}
              </div>

              {/* Mock Events */}
              {i === 1 && (
                <div className="absolute top-24 left-1 right-1 bg-indigo-50 border-l-4 border-indigo-500 p-2 rounded text-xs cursor-pointer hover:bg-indigo-100 transition-colors">
                  <div className="font-semibold text-indigo-900">Besichtigung</div>
                  <div className="text-indigo-700">10:00 - 11:00</div>
                  <div className="text-indigo-600 mt-1 truncate">Max Mustermann</div>
                </div>
              )}
              {i === 3 && (
                <div className="absolute top-48 left-1 right-1 bg-green-50 border-l-4 border-green-500 p-2 rounded text-xs cursor-pointer hover:bg-green-100 transition-colors">
                  <div className="font-semibold text-green-900">Notartermin</div>
                  <div className="text-green-700">12:00 - 13:30</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
