import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
`;

const GreetingBox = styled.div`
  background: linear-gradient(135deg, #ff6b9d 0%, #c06c84 100%);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  color: white;
  font-size: 16px;
  line-height: 1.6;
  font-weight: 500;
`;

const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.3);
  height: 4px;
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  background: white;
  height: 100%;
  width: ${props => props.percent}%;
  transition: width 0.3s ease;
`;

const StageName = styled.h2`
  font-size: 14px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 24px 0 12px 0;
  font-weight: 600;
`;

const MissionCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid ${props => props.isPriority ? "#ff6b9d" : "#e0e0e0"};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  ${props => props.completed && `
    opacity: 0.7;
    background: #f5f5f5;
  `}
`;

const MissionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const MissionTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: #222;
  flex: 1;
`;

const PriorityBadge = styled.span`
  background: #ff6b9d;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MissionDescription = styled.p`
  font-size: 14px;
  color: #666;
  margin: 8px 0;
  line-height: 1.5;
`;

const RewardRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
`;

const Reward = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.color};
`;

const Emoji = styled.span`
  font-size: 16px;
`;

const ProgressTracker = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: #999;
`;

const ProgressDots = styled.div`
  display: flex;
  gap: 4px;
`;

const Dot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.filled ? "#ff6b9d" : "#ddd"};
`;

const Checkmark = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #4caf50;
  color: white;
  border-radius: 50%;
  font-size: 14px;
`;

export default function LilithZ() {
  const [missions, setMissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch("/api/economy/lilith/missions/");
        if (!response.ok) {
          throw new Error("Failed to load missions");
        }
        const data = await response.json();
        setMissions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, []);

  if (loading) {
    return <Container>Loading your missions...</Container>;
  }

  if (error) {
    return <Container>Error: {error}</Container>;
  }

  if (!missions) {
    return <Container>No missions available.</Container>;
  }

  const progressPercent = Math.round(
    (missions.completed_count / missions.total_count) * 100
  );

  // Separate priority and regular missions
  const priorityMissions = missions.missions.filter(m => m.is_priority);
  const regularMissions = missions.missions.filter(m => !m.is_priority);

  return (
    <Container>
      <GreetingBox>
        <div>{missions.greeting}</div>
        <ProgressBar>
          <ProgressFill percent={progressPercent} />
        </ProgressBar>
        <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.9 }}>
          {missions.completed_count} of {missions.total_count} complete
        </div>
      </GreetingBox>

      {priorityMissions.length > 0 && (
        <>
          <StageName>🎯 High Priority</StageName>
          {priorityMissions.map(mission => (
            <MissionCard key={mission.id} isPriority completed={mission.completed}>
              <MissionHeader>
                <MissionTitle>{mission.title}</MissionTitle>
                {mission.is_priority && <PriorityBadge>Priority</PriorityBadge>}
                {mission.completed && <Checkmark>✓</Checkmark>}
              </MissionHeader>
              <MissionDescription>{mission.description}</MissionDescription>
              <RewardRow>
                <Reward color="#4caf50">
                  <Emoji>🍥</Emoji>
                  {mission.reward_spinaz}
                </Reward>
                <Reward color="#ff6b9d">
                  <Emoji>⚡</Emoji>
                  {mission.reward_energy}
                </Reward>
              </RewardRow>
              {mission.action_target > 1 && !mission.completed && (
                <ProgressTracker>
                  <ProgressDots>
                    {[...Array(mission.action_target)].map((_, i) => (
                      <Dot key={i} filled={i < mission.progress} />
                    ))}
                  </ProgressDots>
                  <span>
                    {mission.progress}/{mission.action_target}
                  </span>
                </ProgressTracker>
              )}
            </MissionCard>
          ))}
        </>
      )}

      {regularMissions.length > 0 && (
        <>
          <StageName>Tasks</StageName>
          {regularMissions.map(mission => (
            <MissionCard key={mission.id} completed={mission.completed}>
              <MissionHeader>
                <MissionTitle>{mission.title}</MissionTitle>
                {mission.completed && <Checkmark>✓</Checkmark>}
              </MissionHeader>
              <MissionDescription>{mission.description}</MissionDescription>
              <RewardRow>
                <Reward color="#4caf50">
                  <Emoji>🍥</Emoji>
                  {mission.reward_spinaz}
                </Reward>
                <Reward color="#ff6b9d">
                  <Emoji>⚡</Emoji>
                  {mission.reward_energy}
                </Reward>
              </RewardRow>
              {mission.action_target > 1 && !mission.completed && (
                <ProgressTracker>
                  <ProgressDots>
                    {[...Array(mission.action_target)].map((_, i) => (
                      <Dot key={i} filled={i < mission.progress} />
                    ))}
                  </ProgressDots>
                  <span>
                    {mission.progress}/{mission.action_target}
                  </span>
                </ProgressTracker>
              )}
            </MissionCard>
          ))}
        </>
      )}
    </Container>
  );
}
