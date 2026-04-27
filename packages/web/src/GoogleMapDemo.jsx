import React from 'react';

export default function GoogleMapDemo() {
  return (
    <div style={{ width: '100%', height: 400, borderRadius: 12, overflow: 'hidden', margin: '32px 0' }}>
      <iframe
        title="Google Map"
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={`https://www.google.com/maps/embed/v1/view?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&center=40.7128,-74.0060&zoom=12`}
        allowFullScreen
      />
    </div>
  );
}
