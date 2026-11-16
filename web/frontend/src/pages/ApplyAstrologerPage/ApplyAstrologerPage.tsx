import React from 'react';
import { motion } from 'framer-motion';
import type { ConfirmationResult } from 'firebase/auth';
import { useAppContext } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import { sendFirebasePhoneOtp, toE164 } from '../../services/firebaseClient';
import { COUNTRY_CODES, DEFAULT_COUNTRY, findByIso2, flagEmoji, type CountryCode } from '../../data/countryCodes';
import pageStyles from '../PageRenderer.module.css';

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // ~5MB raw, matches the backend's base64 cap

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
};
const label: React.CSSProperties = { display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' };
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
  background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
};
const field: React.CSSProperties = { marginBottom: 'var(--space-4)' };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ApplyAstrologerPage() {
  const { isLoggedIn, currentUser } = useAppContext();
  // Anonymous visitors skip straight to the form — there's no account to
  // check an "already applied" status against.
  const [status, setStatus] = React.useState<'checking' | 'form' | 'otp' | 'submitted' | 'PENDING' | 'APPROVED' | 'REJECTED'>(isLoggedIn ? 'checking' : 'form');

  const [fullName, setFullName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [country, setCountry] = React.useState<CountryCode>(DEFAULT_COUNTRY);
  const [email, setEmail] = React.useState('');
  const [expertise, setExpertise] = React.useState('');
  const [experience, setExperience] = React.useState('');
  const [languages, setLanguages] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [driveLink, setDriveLink] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Phone OTP — sent before the application is actually submitted; the real
  // submitApplication() call only happens once the code is confirmed (see
  // handleVerifyOtp), same two-step shape as AuthPage's register flow.
  const [pendingPhoneE164, setPendingPhoneE164] = React.useState('');
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = React.useState('');
  const [otpError, setOtpError] = React.useState('');
  const [otpLoading, setOtpLoading] = React.useState(false);
  const [otpSendLoading, setOtpSendLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isLoggedIn) return;
    setFullName(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setPhoneNumber(currentUser?.phoneNumber || '');
    astrologerService.myApplication()
      .then(app => setStatus(app ? app.status : 'form'))
      .catch(() => setStatus('form'));
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = (f: File | null) => {
    setError('');
    if (!f) { setResumeFile(null); return; }
    if (f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
    if (f.size > MAX_RESUME_BYTES) { setError('File is too large — please keep it under 5MB (or share a Google Drive link instead).'); return; }
    setResumeFile(f);
  };

  // Step 1: validate the form, then send the OTP — nothing is submitted yet.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const phoneVal = toE164(phoneNumber, country.dialCode);
      const result = await sendFirebasePhoneOtp(phoneVal, 'firebase-recaptcha-container');
      setConfirmationResult(result);
      setPendingPhoneE164(phoneVal);
      setOtpCode('');
      setOtpError('');
      setStatus('otp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-phone-number')) {
        setError('Please enter a valid phone number — double-check the digit count for your country.');
      } else if (msg.includes('auth/too-many-requests') || msg.includes('quota')) {
        setError('SMS quota exceeded or too many requests. Please try again shortly.');
      } else {
        setError(msg || 'Could not send a verification code to that phone number. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(pendingPhoneE164, 'firebase-recaptcha-container');
      setConfirmationResult(result);
      setOtpCode('');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setOtpSendLoading(false);
    }
  };

  // Step 2: confirm the OTP with Firebase, then actually submit the
  // application with the resulting ID token so the backend can verify it
  // too (see astrologers.routes.ts's POST /applications).
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      if (!confirmationResult) throw new Error('No active verification code — go back and resend it.');
      const credential = await confirmationResult.confirm(otpCode.trim());
      const idToken = await credential.user.getIdToken();
      const resumeData = resumeFile ? await fileToDataUrl(resumeFile) : null;
      await astrologerService.submitApplication({
        fullName, phoneNumber: pendingPhoneE164, email, expertise, experience, languages, bio,
        resumeData, driveLink: driveLink.trim() || null, phoneIdToken: idToken,
      });
      setStatus('submitted');
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/code-expired') setOtpError('This code has expired — tap "Resend code" below for a new one.');
      else if (code === 'auth/invalid-verification-code') setOtpError('That code is incorrect — double-check it and try again.');
      else setOtpError(err instanceof Error ? err.message : 'Could not verify your phone number. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  if (status === 'checking') {
    return <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`} style={{ textAlign: 'center', padding: '140px 20px' }}>Loading…</div>;
  }

  if (status === 'submitted' || status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
    const copy = {
      submitted: { title: 'Application Submitted', body: "Thanks — we've received your application. Our team will review it and get back to you." },
      PENDING: { title: 'Application Under Review', body: "You already have a pending application. We'll let you know once it's been reviewed." },
      APPROVED: { title: "You're Approved!", body: 'Your application was approved — log out and back in to see your astrologer/pandit dashboard.' },
      REJECTED: { title: 'Application Not Approved', body: 'Your application was not approved this time. Reach out through Consult / Contact if you have questions.' },
    }[status];
    return (
      <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`}>
        <div className={pageStyles.container} style={{ maxWidth: '640px', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>✦</span>
          <h1 className={pageStyles.pageTitle} style={{ marginTop: 'var(--space-4)' }}>{copy.title}</h1>
          <p className={pageStyles.pageSubtitle}>{copy.body}</p>
        </div>
      </div>
    );
  }

  if (status === 'otp') {
    return (
      <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`}>
        <div className={pageStyles.container} style={{ maxWidth: '480px' }}>
          <motion.div className={pageStyles.pageHeader} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="section-eyebrow-gold">Verify Your Phone</span>
            <h1 className={pageStyles.pageTitle}>Enter the Code</h1>
            <div className={pageStyles.divider}>✦ ❖ ✦</div>
            <p className={pageStyles.pageSubtitle}>We sent a 6-digit code to {pendingPhoneE164}. Enter it below to submit your application.</p>
          </motion.div>
          <form onSubmit={handleVerifyOtp} style={card}>
            <div style={field}>
              <label style={label}>Verification Code</label>
              <input
                style={input} type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus
              />
            </div>
            {otpError && <p style={{ color: '#c0392b', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{otpError}</p>}
            <button type="submit" className="btn btn-gold" style={{ marginTop: 'var(--space-4)' }} disabled={otpLoading || otpCode.length !== 6}>
              {otpLoading ? 'Verifying…' : 'Verify & Submit Application'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
              <button type="button" onClick={handleResendOtp} disabled={otpSendLoading}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', color: 'inherit' }}>
                {otpSendLoading ? 'Sending…' : "Didn't get it? Resend code"}
              </button>
              <button type="button" onClick={() => setStatus('form')}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', color: 'inherit' }}>
                ← Back
              </button>
            </div>
          </form>
        </div>
        <div id="firebase-recaptcha-container" />
      </div>
    );
  }

  return (
    <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`}>
      <div className={pageStyles.container} style={{ maxWidth: '720px' }}>
        <motion.div className={pageStyles.pageHeader} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="section-eyebrow-gold">Careers</span>
          <h1 className={pageStyles.pageTitle}>Join as an Astrologer / Pandit</h1>
          <div className={pageStyles.divider}>✦ ❖ ✦</div>
          <p className={pageStyles.pageSubtitle}>Tell us about your practice — our team reviews every application before approving an account.</p>
        </motion.div>

        <form onSubmit={handleSubmit} style={card}>
          <h3 className={pageStyles.contentSectionTitle} style={{ marginBottom: 'var(--space-3)' }}>Personal Information</h3>
          <div style={field}>
            <label style={label}>Full Name</label>
            <input style={input} required minLength={2} value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <h3 className={pageStyles.contentSectionTitle} style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Contact Details</h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ ...field, flex: '1 1 200px' }}>
              <label style={label}>Phone Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  style={{ ...input, width: 'auto', flex: '0 0 auto' }}
                  value={country.iso2}
                  onChange={e => { const match = findByIso2(e.target.value); if (match) setCountry(match); }}
                  aria-label="Country code"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.iso2} value={c.iso2}>{flagEmoji(c.iso2)} +{c.dialCode}</option>
                  ))}
                </select>
                <input style={{ ...input, flex: 1 }} type="tel" required minLength={6} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>We'll text you a one-time code to verify this number before submitting.</p>
            </div>
            <div style={{ ...field, flex: '1 1 200px' }}>
              <label style={label}>Email</label>
              <input style={input} type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <h3 className={pageStyles.contentSectionTitle} style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Professional Information</h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ ...field, flex: '1 1 260px' }}>
              <label style={label}>Expertise / Specialization</label>
              <input style={input} required placeholder="Vedic Astrology, Vastu, Tarot…" value={expertise} onChange={e => setExpertise(e.target.value)} />
            </div>
            <div style={{ ...field, flex: '1 1 140px' }}>
              <label style={label}>Years of Experience</label>
              <input style={input} required placeholder="8" value={experience} onChange={e => setExperience(e.target.value)} />
            </div>
          </div>
          <div style={field}>
            <label style={label}>Languages (comma separated)</label>
            <input style={input} required placeholder="Hindi, English" value={languages} onChange={e => setLanguages(e.target.value)} />
          </div>
          <div style={field}>
            <label style={label}>About You</label>
            <textarea style={{ ...input, resize: 'vertical' }} rows={5} required minLength={10} maxLength={3000}
              placeholder="Your background, approach, and what clients can expect from a session with you."
              value={bio} onChange={e => setBio(e.target.value)} />
          </div>

          <h3 className={pageStyles.contentSectionTitle} style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Documents</h3>
          <div style={field}>
            <label style={label}>Resume / Certificates (PDF, max 5MB)</label>
            <input style={input} type="file" accept="application/pdf" onChange={e => handleFile(e.target.files?.[0] || null)} />
          </div>
          <div style={field}>
            <label style={label}>Google Drive Link (optional — for additional certificates)</label>
            <input style={input} type="url" placeholder="https://drive.google.com/…" value={driveLink} onChange={e => setDriveLink(e.target.value)} />
          </div>

          {error && <p style={{ color: '#c0392b', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{error}</p>}

          <button type="submit" className="btn btn-gold" style={{ marginTop: 'var(--space-4)' }} disabled={submitting}>
            {submitting ? 'Sending code…' : 'Verify Phone & Continue'}
          </button>
        </form>
      </div>
      <div id="firebase-recaptcha-container" />
    </div>
  );
}
