# Notification Settings Tab (Frontend Example)
# (Assume this is a React component, but can be adapted to plain JS/HTML)

import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    email_notifications: false,
    push_notifications: false,
    phone_notifications: false,
    marketing_notifications: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    axios.get('/api/notifications/settings/')
      .then(res => {
        setSettings(res.data);
        setLoading(false);
      });
  }, []);

  function handleChange(e) {
    setSettings({ ...settings, [e.target.name]: e.target.checked });
  }

  function handleSave() {
    setSaving(true);
    axios.post('/api/notifications/settings/', settings)
      .then(() => {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      })
      .finally(() => setSaving(false));
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2>Notification Settings</h2>
      <label>
        <input type="checkbox" name="email_notifications" checked={settings.email_notifications} onChange={handleChange} />
        Email Notifications
      </label><br />
      <label>
        <input type="checkbox" name="push_notifications" checked={settings.push_notifications} onChange={handleChange} />
        Push Notifications
      </label><br />
      <label>
        <input type="checkbox" name="phone_notifications" checked={settings.phone_notifications} onChange={handleChange} />
        SMS/Phone Notifications
      </label><br />
      <label>
        <input type="checkbox" name="marketing_notifications" checked={settings.marketing_notifications} onChange={handleChange} />
        Marketing Notifications
      </label><br />
      <button onClick={handleSave} disabled={saving} style={{ marginTop: 16, padding: '8px 18px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: 6 }}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      {success && <div style={{ color: 'green', marginTop: 8 }}>Saved!</div>}
    </div>
  );
}
