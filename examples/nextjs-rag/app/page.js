'use client';

import { useState } from 'react';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useTONL, setUseTONL] = useState(true);
  const [stats, setStats] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, useTONL }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      
      // Update stats
      if (data.stats) {
        setStats(data.stats);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🚀 RAG Chat with TONL</h1>
        <p style={styles.subtitle}>
          Ask questions about AI, RAG, and vector databases
        </p>
      </div>

      {/* Stats Panel */}
      {stats && (
        <div style={styles.statsPanel}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>📊 Original:</span>
            <span style={styles.statValue}>{stats.originalTokens} tokens</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>✨ TONL:</span>
            <span style={styles.statValue}>{stats.compressedTokens} tokens</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>💰 Saved:</span>
            <span style={styles.statValue}>
              {stats.savedTokens} tokens ({stats.compressionRatio}%)
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>📄 Results:</span>
            <span style={styles.statValue}>{stats.resultsCount}</span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <p>💬 Start a conversation!</p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              Try: "What is RAG?" or "How do vector databases work?"
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageRole}>
                {msg.role === 'user' ? '👤 You' : '🤖 AI'}
              </div>
              <div style={styles.messageContent}>{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div style={styles.loadingMessage}>
            <div style={styles.loadingDots}>
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.toggleContainer}>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={useTONL}
              onChange={(e) => setUseTONL(e.target.checked)}
            />
            <span style={{ marginLeft: '8px' }}>
              Use TONL compression (40-60% savings)
            </span>
          </label>
        </div>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question..."
            style={styles.input}
            disabled={loading}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? '...' : '→'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: '#fff',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  statsPanel: {
    display: 'flex',
    gap: '20px',
    padding: '16px 20px',
    backgroundColor: '#f0f7ff',
    borderBottom: '1px solid #d0e7ff',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0066cc',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    marginTop: '100px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0066cc',
    color: '#fff',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    color: '#000',
  },
  messageRole: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '4px',
    opacity: 0.8,
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  loadingMessage: {
    alignSelf: 'flex-start',
    padding: '12px 16px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
    fontSize: '20px',
    animation: 'pulse 1.5s infinite',
  },
  form: {
    padding: '20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fff',
  },
  toggleContainer: {
    marginBottom: '12px',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    cursor: 'pointer',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
