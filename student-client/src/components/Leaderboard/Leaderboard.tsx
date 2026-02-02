import React from 'react';

export interface LeaderboardEntry {
  participant_id: number;
  name: string;
  score: number;
  rank: number;
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentParticipantId?: string | null; // This comes from localStorage (string)
  compact?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  leaderboard, 
  currentParticipantId,
  compact = false 
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  const getRowStyle = (entry: LeaderboardEntry) => {
    // FIX: Convert currentParticipantId to number for comparison
    const isCurrentUser = currentParticipantId && entry.participant_id === parseInt(currentParticipantId);
    
    return {
      backgroundColor: isCurrentUser ? '#e3f2fd' : 'transparent',
      fontWeight: isCurrentUser ? 'bold' as const : 'normal' as const,
      borderLeft: isCurrentUser ? '4px solid #2196f3' : 'none'
    };
  };

  if (compact) {
    return (
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        padding: '15px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>🏆 Leaderboard</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {leaderboard.slice(0, 5).map((entry) => (
            <div
              key={entry.participant_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #e9ecef',
                ...getRowStyle(entry)
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ minWidth: '20px', textAlign: 'center' }}>
                  {getRankIcon(entry.rank)}
                </span>
                <span style={{ 
                  fontSize: '0.9em',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {entry.name}
                </span>
              </div>
              <span style={{ 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                {entry.score}
              </span>
            </div>
          ))}
        </div>
        {leaderboard.length > 5 && (
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.8em', 
            color: '#6c757d',
            marginTop: '8px'
          }}>
            +{leaderboard.length - 5} more participants
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      padding: '20px',
      border: '2px solid #007bff'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#007bff', textAlign: 'center' }}>
        🏆 Live Leaderboard
      </h3>
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', width: '60px' }}>Rank</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '100px' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr 
                key={entry.participant_id}
                style={{
                  borderBottom: '1px solid #dee2e6',
                  ...getRowStyle(entry)
                }}
              >
                <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '1.1em' }}>
                  {getRankIcon(entry.rank)}
                </td>
                <td style={{ padding: '12px' }}>{entry.name}</td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'right', 
                  fontWeight: 'bold',
                  fontSize: '1.1em',
                  color: '#28a745'
                }}>
                  {entry.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Quick Stats */}
      {leaderboard.length > 0 && (
        <div style={{ 
          marginTop: '15px', 
          padding: '12px',
          backgroundColor: '#e9ecef',
          borderRadius: '6px',
          fontSize: '0.9em',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span><strong>Participants:</strong> {leaderboard.length}</span>
          <span><strong>Top Score:</strong> {leaderboard[0]?.score || 0}</span>
          <span>
            <strong>Average:</strong> {Math.round(leaderboard.reduce((sum, entry) => sum + entry.score, 0) / leaderboard.length) || 0}
          </span>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;