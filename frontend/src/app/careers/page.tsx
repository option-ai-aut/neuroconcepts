'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Globe,
  Zap,
  Heart,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import { getApiUrl } from '@/lib/api';

interface Job {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  type?: string;
  remote?: boolean;
  description?: string;
}

interface JobApiResponse {
  jobs: Job[];
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Vollzeit',
  PART_TIME: 'Teilzeit',
  CONTRACT: 'Freelance',
  INTERNSHIP: 'Praktikum',
};

const BENEFITS = [
  {
    icon: Globe,
    title: 'Remote-first',
    description: 'Arbeite von überall — wir vertrauen unserem Team',
  },
  {
    icon: Zap,
    title: 'Neueste Technologie',
    description: 'KI, Cloud, modernste Tools',
  },
  {
    icon: Heart,
    title: 'Work-Life-Balance',
    description: 'Flexible Arbeitszeiten, keine Überstunden-Kultur',
  },
  {
    icon: Users,
    title: 'Starkes Team',
    description: 'Kleine, schlagkräftige Teams mit flachen Hierarchien',
  },
];

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isInView };
}

export default function KarrierePage() {
  const heroRef = useInView();
  const benefitsRef = useInView();
  const jobsSectionRef = useInView();
  const ctaRef = useInView();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyModalJob, setApplyModalJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    coverLetter: '',
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getApiUrl()}/jobs`)
      .then((res) => res.json())
      .then((data: JobApiResponse) => {
        setJobs(data.jobs ?? []);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch jobs:', err);
        setError('Stellen konnten nicht geladen werden.');
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApplyClick = (job: Job) => {
    setApplyModalJob(job);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', coverLetter: '' });
    setSubmitStatus('idle');
    setSubmitError(null);
  };

  const handleCloseModal = () => {
    setApplyModalJob(null);
    setSubmitStatus('idle');
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalJob) return;
    setSubmitStatus('submitting');
    setSubmitError(null);
    try {
      const res = await fetch(`${getApiUrl()}/jobs/${applyModalJob.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          coverLetter: formData.coverLetter.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bewerbung konnte nicht gesendet werden.');
      setSubmitStatus('success');
    } catch (err: unknown) {
      setSubmitStatus('error');
      setSubmitError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="careers" />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 bg-white">
        <div
          ref={heroRef.ref}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          style={{
            opacity: heroRef.isInView ? 1 : 0,
            transform: heroRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6">
            Karriere bei Immivo
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Gestalte die Zukunft der Immobilienbranche mit.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
            Warum Immivo?
          </h2>
          <div ref={benefitsRef.ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {BENEFITS.map((benefit, i) => (
              <div
                key={i}
                className="text-center"
                style={{
                  opacity: benefitsRef.isInView ? 1 : 0,
                  transform: benefitsRef.isInView ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'opacity 0.7s ease, transform 0.7s ease',
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <benefit.icon className="w-6 sm:w-7 h-6 sm:h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
                  {benefit.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={jobsSectionRef.ref}
            style={{
              opacity: jobsSectionRef.isInView ? 1 : 0,
              transform: jobsSectionRef.isInView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
              Offene Stellen
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                <p className="text-gray-500">Stellen werden geladen...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">{error}</p>
                <p className="text-gray-500 text-sm">
                  Aber wir freuen uns immer über Initiativbewerbungen.
                </p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Aktuell keine offenen Stellen
                </p>
                <p className="text-gray-600">
                  Aber wir freuen uns immer über Initiativbewerbungen.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job, i) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all"
                    style={{
                      opacity: jobsSectionRef.isInView ? 1 : 0,
                      transform: jobsSectionRef.isInView ? 'translateY(0)' : 'translateY(30px)',
                      transition: 'opacity 0.7s ease, transform 0.7s ease',
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          {job.department && (
                            <span className="px-2 py-1 bg-gray-50 text-blue-600 rounded-md font-medium">
                              {job.department}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </span>
                          )}
                          {job.remote && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Remote
                            </span>
                          )}
                          {job.type && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {JOB_TYPE_LABELS[job.type] ?? job.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyClick(job)}
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base w-full sm:w-auto"
                      >
                        Bewerben
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16">
        <div
          ref={ctaRef.ref}
          className="max-w-4xl mx-auto px-4 text-center"
          style={{
            opacity: ctaRef.isInView ? 1 : 0,
            transform: ctaRef.isInView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
            Keine passende Stelle gefunden?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
            Sende uns eine Initiativbewerbung an{' '}
            <a
              href="mailto:office@immivo.ai"
              className="text-gray-900 font-medium hover:underline"
            >
              office@immivo.ai
            </a>
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center text-gray-900 font-medium hover:underline"
          >
            Kontakt aufnehmen
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />

      {/* Application Modal */}
      {applyModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 min-w-0 truncate pr-2">
                Bewerbung: {applyModalJob.title}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitStatus === 'success' ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  Bewerbung gesendet!
                </h4>
                <p className="text-gray-600 mb-6">
                  Vielen Dank. Wir melden uns in Kürze bei dir.
                </p>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, firstName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, lastName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="Mustermann"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, email: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="max@beispiel.de"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon (optional)
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, phone: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="+43 123 456789"
                  />
                </div>
                <div>
                  <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-1">
                    Anschreiben (optional)
                  </label>
                  <textarea
                    id="coverLetter"
                    rows={4}
                    value={formData.coverLetter}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, coverLetter: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none"
                    placeholder="Warum möchtest du bei Immivo arbeiten?"
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                    {submitError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitStatus === 'submitting'}
                    className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitStatus === 'submitting' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      'Bewerbung senden'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
