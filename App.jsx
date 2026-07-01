import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

// Change this URL to your local server for now, later we will replace it with Render URL
const SOCKET_URL = "http://localhost:5000"; 
let socket;

export default function App() {
    // Application States
    const [screen, setScreen] = useState('login'); // login, otp, chat
    const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
    const [otpCode, setOtpCode] = useState('');
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');
    const [chatList, setChatList] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isHold, setIsHold] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profilePic, setProfilePic] = useState('https://via.placeholder.com/150');

    // Initialize Socket Connection when logged in
    useEffect(() => {
        if (user) {
            socket = io(SOCKET_URL);
            socket.emit('join_user', user.id);

            // Listen for live messages
            socket.on('receive_message', (data) => {
                setChatList((prev) => [...prev, data]);
            });

            // Listen for Instagram style notifications
            socket.on('receive_notification', (notif) => {
                setNotifications((prev) => [notif, ...prev]);
                // Auto dismiss notification after 4 seconds
                setTimeout(() => {
                    setNotifications((prev) => prev.slice(0, -1));
                }, 4000);
            });
        }
    }, [user]);

    // Handle Registration & OTP Request
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${SOCKET_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authData)
            });
            const data = await res.json();
            if (data.success) {
                alert('OTP Sent to your email successfully!');
                setScreen('otp');
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Server error connecting to authentication API');
        }
    };

    // Handle OTP Verification & Login Approval
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${SOCKET_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authData.email, otp: otpCode })
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setScreen('chat');
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Invalid OTP Configuration');
        }
    };

    // Handle Sending Message Live
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !activeChat) return;

        const msgData = {
            senderId: user.id,
            receiverId: activeChat.id,
            text: message,
            timestamp: new Date().toLocaleTimeString()
        };

        socket.emit('send_message', msgData);
        setChatList((prev) => [...prev, msgData]);
        setMessage('');
    };

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#fff', height: '100vh', margin: 0, padding: 0 }}>
            
            {/* 1. INSTAGRAM STYLE NOTIFICATION BAR */}
            <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
                {notifications.map((n, idx) => (
                    <div key={idx} style={{ backgroundColor: '#1e293b', borderLeft: '4px solid #3b82f6', padding: '15px 25px', borderRadius: '8px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s ease' }}>
                        <strong>🔔 Notification</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#cbd5e1' }}>{n.text}</p>
                    </div>
                ))}
            </div>

            {/* 2. LOGIN SCREEN */}
            {screen === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <form onSubmit={handleRegister} style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Create Account</h2>
                        <input type="text" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: 'none', background: '#334155', color: '#fff' }} onChange={e => setAuthData({...authData, name: e.target.value})} />
                        <input type="email" placeholder="Email Address" required style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: 'none', background: '#334155', color: '#fff' }} onChange={e => setAuthData({...authData, email: e.target.value})} />
                        <input type="password" placeholder="Password" required style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '6px', border: 'none', background: '#334155', color: '#fff' }} onChange={e => setAuthData({...authData, password: e.target.value})} />
                        <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Send OTP Verification</button>
                    </form>
                </div>
            )}

            {/* 3. OTP SCREEN */}
            {screen === 'otp' && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <form onSubmit={handleVerifyOtp} style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                        <h2>Enter 6-Digit OTP</h2>
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '25px' }}>We sent a secure code to your email account.</p>
                        <input type="text" maxLength="6" placeholder="000000" required style={{ width: '60%', padding: '15px', letterSpacing: '8px', fontSize: '20px', textAlign: 'center', marginBottom: '25px', borderRadius: '6px', border: 'none', background: '#334155', color: '#fff' }} onChange={e => setOtpCode(e.target.value)} />
                        <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Verify & Secure Login</button>
                    </form>
                </div>
            )}

            {/* 4. MAIN CHAT DASHBOARD INTERFACE (Matching your manual chart UI) */}
            {screen === 'chat' && (
                <div style={{ display: 'flex', height: '100vh' }}>
                    
                    {/* LEFT NAVIGATION SIDEBAR */}
                    <div style={{ width: '80px', backgroundColor: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', borderRight: '1px solid #334155' }}>
                        <img src={profilePic} alt="Profile" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', marginBottom: '40px' }} onClick={() => setIsEditingProfile(!isEditingProfile)} />
                        <div style={{ fontSize: '24px', marginBottom: '30px', cursor: 'pointer' }}>💬</div>
                        <div style={{ fontSize: '24px', marginBottom: '30px', cursor: 'pointer' }}>📞</div>
                        <div style={{ fontSize: '24px', cursor: 'pointer', marginTop: 'auto' }} onClick={() => setScreen('login')}>🚪</div>
                    </div>

                    {/* MIDDLE CHAT WINDOW */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
                        
                        {/* Chat Window Header */}
                        <div style={{ height: '70px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', padding: '0 25px', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
                            <div>
                                <h4 style={{ margin: 0 }}>{activeChat ? activeChat.name : "Select a user to connect"}</h4>
                                <span style={{ fontSize: '12px', color: '#10b981' }}>{activeChat ? "Active Status Live" : ""}</span>
                            </div>
                            
                            {/* Call Control Center (Mute, Hold) */}
                            {activeChat && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setIsMuted(!isMuted)} style={{ backgroundColor: isMuted ? '#ef4444' : '#334155', border: 'none', padding: '8px 15px', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                                        {isMuted ? "🔇 Muted" : "🎙️ Mute"}
                                    </button>
                                    <button onClick={() => setIsHold(!isHold)} style={{ backgroundColor: isHold ? '#f59e0b' : '#334155', border: 'none', padding: '8px 15px', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                                        {isHold ? "⏸️ On Hold" : "▶️ Hold"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Messages Box Area */}
                        <div style={{ flex: 1, padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {chatList.map((msg, index) => (
                                <div key={index} style={{ maxWidth: '60%', padding: '12px 18px', borderRadius: '12px', fontSize: '15px', alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start', backgroundColor: msg.senderId === user.id ? '#3b82f6' : '#334155' }}>
                                    <div>{msg.text}</div>
                                    <small style={{ fontSize: '10px', color: '#cbd5e1', display: 'block', textAlign: 'right', marginTop: '5px' }}>{msg.timestamp}</small>
                                </div>
                            ))}
                        </div>

                        {/* Message Input Form */}
                        {activeChat ? (
                            <form onSubmit={handleSendMessage} style={{ height: '70px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '15px' }}>
                                <input type="text" placeholder="Type your secure message..." value={message} style={{ flex: 1, padding: '12px 20px', borderRadius: '30px', border: 'none', background: '#334155', color: '#fff', fontSize: '15px' }} onChange={e => setMessage(e.target.value)} />
                                <button type="submit" style={{ backgroundColor: '#3b82f6', border: 'none', width: '45px', height: '45px', borderRadius: '50%', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>➔</button>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }} onClick={() => setActiveChat({id: 'dummy123', name: 'Global Random Room'})}>
                                Click here to open <strong>Global Random Room</strong> and test chat
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDEBAR: EDIT PROFILE PANEL */}
                    {isEditingProfile && (
                        <div style={{ width: '300px', backgroundColor: '#1e293b', borderLeft: '1px solid #334155', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h3>Edit Profile Picture</h3>
                            <img src={profilePic} alt="Preview" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '20px 0' }} />
                            <input type="text" placeholder="Paste Image URL to change" value={profilePic} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: '#334155', color: '#fff', marginBottom: '20px', fontSize: '13px' }} onChange={e => setProfilePic(e.target.value)} />
                            <button onClick={() => setIsEditingProfile(false)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Save Settings</button>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

