import React, { useState } from 'react';

const steps = [
  {
    title: "Welcome to MusicConnectZ! 🎉",
    content: "I'm Corey. I'll show you around and help you get the most out of your music journey. Ready? Let’s go!",
  },
  {
    title: "Sign In or Sign Up",
    content: "Start by logging in with your favorite provider (Google, Facebook, etc.) for the fastest access. Manual login is always available at the bottom if you need it.",
  },
  {
    title: "Live Social Feed",
    content: "Check out the Social Feed to see what’s trending, who’s battling, and what’s new in the community.",
  },
  {
    title: "Battles & Collabs",
    content: "Jump into Battles to compete, or use Collab options to connect with artists locally or globally. Set your radius or go worldwide!",
  },
  {
    title: "Need Help?",
    content: "Just let me know what you want to do, or click the ? icon for tips and support—I'm always here for you!",
  },
];

export default function OnboardingTour({ onFinish }) {
  const [step, setStep] = useState(0);

  return (89
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, boxShadow: '0 4px 24px #0003', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>{steps[step].title}</h2>
        <div style={{ fontSize: 18, marginBottom: 28 }}>{steps[step].content}</div>
        <div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ marginRight: 12 }}>Back</button>
          )}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={{ fontWeight: 600 }}>Next</button>
          ) : (
            <button onClick={onFinish} style={{ fontWeight: 600 }}>Finish</button>
          )}
        </div>
      </div>
    </div>
  );
}
