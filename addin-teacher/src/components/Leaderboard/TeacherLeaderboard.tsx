import React from 'react';

export interface LeaderboardEntry {
  participant_id: number;
  name: string;
  score: number;
  rank: number;
}

interface TeacherLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

const TeacherLeaderboard: React.FC<TeacherLeaderboardProps> = ({ 
  leaderboard, 
  isVisible = true,
  onToggleVisibility 
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return { backgroundColor: '#fff3cd', color: '#856404' }; // Gold
      case 2: return { backgroundColor: '#e9ecef', color: '#495057' }; // Silver
      case 3: return { backgroundColor: '#f8d7da', color: '#721c24' }; // Bronze
      default: return { backgroundColor: 'white', color: '#212529' };
    }
  };

  if (!isVisible) {
    return (
      <div style={{
        padding: '15px',
        backgroundColor: '#6c757d',
        borderRadius: '8px',
        textAlign: 'center',
        color: 'white',
        cursor: 'pointer'
      }}
      onClick={onToggleVisibility}>
        <h4 style={{ margin: 0 }}>👁️ Show Leaderboard</h4>
      </div>
    );
  }

  const topScore = leaderboard[0]?.score || 0;
  const averageScore = leaderboard.length > 0 
    ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.score, 0) / leaderboard.length) 
    : 0;

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      border: '3px solid #007bff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #dee2e6'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: '#007bff',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          🏆 Live Leaderboard
          <span style={{
            fontSize: '0.8em',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {leaderboard.length} students
          </span>
        </h3>
        
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9em'
            }}
          >
            👁️ Hide
          </button>
        )}
      </div>

      {/* Stats Bar */}
      {leaderboard.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#e9ecef',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#007bff' }}>
              {leaderboard.length}
            </div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Participants</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#28a745' }}>
              {topScore}
            </div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Top Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#ffc107' }}>
              {averageScore}
            </div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Average</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#17a2b8' }}>
              {leaderboard.filter(p => p.score > 0).length}
            </div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Scored</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        {leaderboard.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d',
            fontStyle: 'italic'
          }}>
            No participants yet. Waiting for students to join...
          </div>
        ) : (
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.95em'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#007bff', 
                color: 'white',
                position: 'sticky',
                top: 0
              }}>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'center', 
                  width: '70px',
                  fontSize: '0.9em'
                }}>
                  Rank
                </th>
                <th style={{ 
                  padding: '12px 12px', 
                  textAlign: 'left',
                  fontSize: '0.9em'
                }}>
                  Student
                </th>
                <th style={{ 
                  padding: '12px 12px', 
                  textAlign: 'right', 
                  width: '100px',
                  fontSize: '0.9em'
                }}>
                  Score
                </th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'center', 
                  width: '80px',
                  fontSize: '0.9em'
                }}>
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => {
                const progressPercentage = topScore > 0 ? (entry.score / topScore) * 100 : 0;
                
                return (
                  <tr 
                    key={entry.participant_id}
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <td style={{ 
                      padding: '12px 8px', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      ...getRankStyle(entry.rank)
                    }}>
                      {getRankIcon(entry.rank)}
                    </td>
                    <td style={{ 
                      padding: '12px 12px',
                      fontWeight: entry.rank <= 3 ? 'bold' : 'normal'
                    }}>
                      {entry.name}
                    </td>
                    <td style={{ 
                      padding: '12px 12px', 
                      textAlign: 'right', 
                      fontWeight: 'bold',
                      fontSize: '1.1em',
                      color: '#28a745'
                    }}>
                      {entry.score}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progressPercentage}%`,
                          height: '100%',
                          backgroundColor: 
                            entry.rank === 1 ? '#ffc107' :
                            entry.rank === 2 ? '#6c757d' :
                            entry.rank === 3 ? '#cd7f32' : '#007bff',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <div style={{
                        fontSize: '0.7em',
                        color: '#6c757d',
                        marginTop: '2px'
                      }}>
                        {Math.round(progressPercentage)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {leaderboard.length > 0 && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#d1edff',
          borderRadius: '6px',
          fontSize: '0.8em',
          color: '#0056b3',
          textAlign: 'center'
        }}>
          <strong>Live Updates:</strong> Leaderboard updates automatically as students answer questions
        </div>
      )}
    </div>
  );
};

export default TeacherLeaderboard;