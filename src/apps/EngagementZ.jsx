import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { goToSpot } from '../goto';

export default function EngagementZ() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const kindLabels = {
    follow: 'Started following',
    like: 'Liked your post',
    rate: 'Rated your take',
    post_publish: 'Published a post',
    collab_invite: 'Invited you to collaborate',
    collab_accept: 'Accepted collaboration',
    collab_complete: 'Completed collaboration',
    battle_invite: 'Invited you to battle',
    battle_enter: 'Entered your battle',
    battle_win: 'Won a battle against you',
    take_score: 'Scored a take',
    profile_view: 'Viewed your profile',
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async (newOffset = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/economy/activity-feed/my_feed/', {
        params: { offset: newOffset, limit: 20 },
      });

      if (newOffset === 0) {
        setEvents(response.events || []);
      } else {
        setEvents(prev => [...prev, ...(response.events || [])]);
      }

      setHasMore((response.events || []).length > 0);
      setOffset(newOffset);
    } catch (err) {
      setError(err.message || 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (eventId) => {
    try {
      await api.post('/api/economy/activity-feed/mark_read/', { event_id: eventId });
      // Update local state
      setEvents(prev =>
        prev.map(e => (e.id === eventId ? { ...e, read: true } : e))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/economy/activity-feed/mark_read/', {});
      // Update local state
      setEvents(prev => prev.map(e => ({ ...e, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleEventClick = (event) => {
    if (event.target && event.app_key) {
      goToSpot(event.app_key, event.target);
    }
    // Mark as read when clicked
    if (!event.read) {
      markAsRead(event.id);
    }
  };

  const loadMore = () => {
    loadFeed(offset + 20);
  };

  return (
    <div className="engagement-z">
      <div className="header">
        <h2>Activity Feed</h2>
        {events.some(e => !e.read) && (
          <button onClick={markAllAsRead} className="btn-text">
            Mark all as read
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && events.length === 0 && <div className="loading">Loading...</div>}

      {events.length === 0 && !loading ? (
        <div className="empty-state">No activity yet</div>
      ) : (
        <div className="activity-list">
          {events.map((event) => (
            <div
              key={event.id}
              className={`activity-item ${!event.read ? 'unread' : ''}`}
              onClick={() => handleEventClick(event)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleEventClick(event);
              }}
            >
              <div className="activity-content">
                <div className="activity-text">
                  <span className="actor-name">{event.actor?.username}</span>
                  <span className="activity-kind">
                    {kindLabels[event.kind] || event.kind}
                  </span>
                </div>
                <div className="activity-meta">
                  <span className="timestamp">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                  {!event.read && <span className="unread-badge">●</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && events.length > 0 && (
        <button onClick={loadMore} className="btn-load-more">
          Load more
        </button>
      )}

      <style>{`
        .engagement-z {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .engagement-z .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .engagement-z h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .engagement-z .btn-text {
          background: none;
          border: none;
          color: var(--text-link);
          cursor: pointer;
          padding: 0;
          font-size: 0.875rem;
        }

        .engagement-z .btn-text:hover {
          text-decoration: underline;
        }

        .engagement-z .error-message {
          padding: 1rem;
          background: var(--bg-error, #fee);
          color: var(--text-error, #c33);
          border-radius: 0.5rem;
          margin: 0.5rem;
        }

        .engagement-z .loading {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .engagement-z .empty-state {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .activity-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .activity-item {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .activity-item:hover {
          background-color: var(--bg-hover, rgba(0,0,0,0.05));
        }

        .activity-item.unread {
          background-color: var(--bg-highlight, rgba(0,0,0,0.02));
        }

        .activity-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .activity-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .actor-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .activity-kind {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .timestamp {
          color: var(--text-tertiary);
          font-size: 0.75rem;
        }

        .unread-badge {
          width: 0.5rem;
          height: 0.5rem;
          background: var(--text-primary);
          border-radius: 50%;
          margin-left: auto;
        }

        .btn-load-more {
          padding: 0.75rem 1rem;
          margin: 1rem;
          background: var(--btn-primary-bg);
          color: var(--btn-primary-text);
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-load-more:hover {
          opacity: 0.8;
        }

        @media (prefers-color-scheme: dark) {
          .engagement-z .error-message {
            background: var(--bg-error, #322);
            color: var(--text-error, #f99);
          }

          .activity-item:hover {
            background-color: rgba(255,255,255,0.05);
          }

          .activity-item.unread {
            background-color: rgba(255,255,255,0.02);
          }
        }
      `}</style>
    </div>
  );
}
