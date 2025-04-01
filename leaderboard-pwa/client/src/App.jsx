import { useState, useEffect } from 'react'
import { 
  signup, 
  login, 
  logout, 
  onAuthChange, 
  getLeaderboard, 
  requestBalanceUpdate, 
  getPendingUpdates, 
  approveBalanceUpdate,
  addUserToFirestore,
  checkIfModerator,
  db // Import db
} from './firebase'
import { doc, getDoc } from 'firebase/firestore';
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [isModerator, setIsModerator] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [pendingUpdates, setPendingUpdates] = useState([])
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [showSignup, setShowSignup] = useState(false)
  
  // UI state
  const [menuOpen, setMenuOpen] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [pendingModalOpen, setPendingModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [newBalanceValue, setNewBalanceValue] = useState('')
  
  // Fetch leaderboard on component mount (without requiring authentication)
  useEffect(() => {
    fetchLeaderboard();
    
    onAuthChange(async (user) => {
      if (user) {
        setUser(user);
        // Default to email prefix
        let displayName = user.email.split('@')[0];
        
        // Try to get the user's actual name from Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.name) {
              displayName = userData.name;
            }
          }
        } catch (error) {
          console.error("Error getting user data:", error);
        }
        
        setUsername(displayName);
        
        // Check if the user is a moderator by email
        setIsModerator(checkIfModerator(user.email));
        
        fetchPendingUpdates();
      } else {
        setUser(null);
        setUsername('');
        setIsModerator(false);
        setPendingUpdates([]);
      }
    });
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      console.log("Fetching leaderboard data...");
      const data = await getLeaderboard();
      console.log("Raw leaderboard data:", data);
      
      // Don't filter by name as this might cause issues
      setLeaderboard(data);
      
      console.log("Leaderboard state updated with", data.length, "users");
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  // Fetch pending updates (requires auth)
  const fetchPendingUpdates = async () => {
    if (!user) return;
    try {
      const data = await getPendingUpdates();
      setPendingUpdates(data);
    } catch (error) {
      console.error("Error fetching pending updates:", error);
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      console.log("Attempting signup with:", { ...signupData, password: "[HIDDEN]" });
      
      // First create the authentication account
      const userCredential = await signup(signupData.email, signupData.password);
      console.log("Firebase Auth account created:", userCredential.user.uid);
      
      // Create user data object
      const userData = {
        name: signupData.name,
        balance: 0.00,
        createdAt: new Date().toISOString()
      };
      
      // Then store the user's name in Firestore
      console.log("Adding user to Firestore:", userData);
      await addUserToFirestore(userCredential.user.uid, userData);
      
      alert('Signup successful! Please log in.');
      setShowSignup(false);
      
      // Refresh leaderboard after signup
      fetchLeaderboard();
    } catch (error) {
      console.error("Signup error:", error);
      alert(error.message);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(loginData.email, loginData.password);
      setAuthModalOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  // Handle balance update request
  const requestUpdate = async () => {
    if (!user) {
      alert('You must be logged in to update balances');
      setUpdateModalOpen(false);
      setAuthModalOpen(true);
      return;
    }
    
    if (!newBalanceValue) {
      alert('Please enter a valid balance');
      return;
    }
    
    try {
      // Use the current user's ID directly
      await requestBalanceUpdate(user.uid, username, parseFloat(newBalanceValue));
      alert('Update requested, awaiting moderator approval');
      setNewBalanceValue('');
      setUpdateModalOpen(false);
      fetchPendingUpdates();
    } catch (error) {
      alert('Error requesting update: ' + error.message);
    }
  };

  // Moderator approves update
  const approveUpdate = async (updateId, userId, newBalance) => {
    if (!user || !isModerator) {
      alert('You must be a moderator to approve updates');
      return;
    }
    
    try {
      await approveBalanceUpdate(updateId, userId, newBalance);
      fetchLeaderboard();
      fetchPendingUpdates();
    } catch (error) {
      alert('Error approving update: ' + error.message);
    }
  };
  
  // Toggle menu and modals
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    const menuIcon = document.querySelector('.menu-icon');
    if (menuIcon) {
      menuIcon.classList.toggle('open');
    }
  };
  
  const toggleUpdateModal = () => {
    if (!user) {
      setAuthModalOpen(true);
      setMenuOpen(false);
      const menuIcon = document.querySelector('.menu-icon');
      if (menuIcon) {
        menuIcon.classList.remove('open');
      }
      return;
    }
    
    setUpdateModalOpen(!updateModalOpen);
    setMenuOpen(false);
    const menuIcon = document.querySelector('.menu-icon');
    if (menuIcon) {
      menuIcon.classList.remove('open');
    }
    
    // Set focus on input and format to 2 decimal places
    if (!updateModalOpen) {
      setTimeout(() => {
        const input = document.getElementById('new-balance');
        if (input) {
          input.focus();
        }
      }, 100);
    }
  };
  
  const togglePendingModal = () => {
    if (!user || !isModerator) {
      alert('You must be a moderator to view pending updates');
      return;
    }
    
    setPendingModalOpen(!pendingModalOpen);
    setMenuOpen(false);
    const menuIcon = document.querySelector('.menu-icon');
    if (menuIcon) {
      menuIcon.classList.remove('open');
    }
  };
  
  const toggleAuthModal = () => {
    setAuthModalOpen(!authModalOpen);
    setMenuOpen(false);
    const menuIcon = document.querySelector('.menu-icon');
    if (menuIcon) {
      menuIcon.classList.remove('open');
    }
  };
  
  const toggleModeratorMode = () => {
    setIsModerator(!isModerator);
    setMenuOpen(false);
    const menuIcon = document.querySelector('.menu-icon');
    if (menuIcon) {
      menuIcon.classList.remove('open');
    }
  };

  // Format balance to always show 2 decimal places
// Format balance to always show 2 decimal places with commas for thousands
const formatBalance = (balance) => {
  return parseFloat(balance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

  return (
    <div className="container">
      <div className="header">
        <h1>Payouts</h1>
        <div className="header-controls">
          <div className="menu-icon" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            {user && isModerator && pendingUpdates.length > 0 && <div className="notification-dot"></div>}
          </div>
        </div>
      </div>
      <div className="divider"></div>
      <div className="payout-list">
        {leaderboard.length === 0 ? (
          <div className="no-users">
            <p>No users yet</p>
          </div>
        ) : (
          leaderboard.map((user, index) => (
            <div className="payout-item" key={user.id}>
              <div className="payout-number">{index + 1}.</div>
              <div className="payout-name">{user.name}</div>
              <div className="payout-balance">${formatBalance(user.balance)}</div>
            </div>
          ))
        )}
      </div>
      
      {/* Menu Dropdown */}
      <div className={`menu-dropdown ${menuOpen ? 'show' : ''}`}>
        {user ? (
          <>
            <div className="menu-item" onClick={toggleUpdateModal}>Update Balance</div>
            {isModerator && (
              <>
                <div className="menu-item pending" onClick={togglePendingModal}>
                  <span>Pending Updates</span>
                  {pendingUpdates.length > 0 && <span className="count">{pendingUpdates.length}</span>}
                </div>
                <div className="menu-divider"></div>
                <div className="menu-item active">Moderator Mode</div>
              </>
            )}
            <div className="menu-divider"></div>
            <div className="menu-item logout" onClick={handleLogout}>Logout</div>
          </>
        ) : (
          <div className="menu-item" onClick={toggleAuthModal}>Login</div>
        )}
      </div>

      {/* Modal for Balance Updates */}
      <div className={`modal-overlay ${updateModalOpen ? 'show' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2>Update Balance</h2>
            <button className="close-modal" onClick={toggleUpdateModal}>×</button>
          </div>
          <form className="modal-form">
            <div className="form-group">
              <label htmlFor="new-balance">New Balance</label>
              <input 
                type="number" 
                id="new-balance" 
                placeholder="Enter new balance" 
                step="0.01" 
                min="0"
                pattern="^\d+(\.\d{2})?$"
                value={newBalanceValue}
                onChange={(e) => setNewBalanceValue(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) {
                    setNewBalanceValue(parseFloat(e.target.value).toFixed(2));
                  }
                }}
              />
            </div>
            <button 
              type="button" 
              className="form-submit"
              onClick={requestUpdate}
            >
              Request Update
            </button>
          </form>
        </div>
      </div>

      {/* Auth Modal */}
      <div className={`modal-overlay ${authModalOpen ? 'show' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2>{showSignup ? 'Signup' : 'Login'}</h2>
            <button className="close-modal" onClick={toggleAuthModal}>×</button>
          </div>
          <div className="auth-form">
            {showSignup ? (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label htmlFor="signup-name">Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    placeholder="Enter your name (will appear on leaderboard)"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                  />
                </div>
                <button className="form-submit" type="submit">Signup</button>
                <p>
                  Already have an account?{' '}
                  <span className="link" onClick={() => setShowSignup(false)}>Login</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <button className="form-submit" type="submit">Login</button>
                <p>
                  Don't have an account?{' '}
                  <span className="link" onClick={() => setShowSignup(true)}>Signup</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Pending Updates (Moderator only) */}
      {user && isModerator && (
        <div className={`modal-overlay ${pendingModalOpen ? 'show' : ''}`}>
          <div className="modal">
            <div className="modal-header">
              <h2>Pending Updates</h2>
              <button className="close-modal" onClick={togglePendingModal}>×</button>
            </div>
            <div className="pending-updates">
              {pendingUpdates.length === 0 ? (
                <div className="no-updates">No pending balance updates to approve.</div>
              ) : (
                pendingUpdates.map(update => (
                  <div className="pending-item" key={update.id}>
                    <div className="pending-info">
                      <span className="name">{update.name}:</span>
                      <span className="balance">${formatBalance(update.newBalance)}</span>
                    </div>
                    <button 
                      className="approve-btn"
                      onClick={() => approveUpdate(update.id, update.userId, update.newBalance)}
                    >
                      Approve
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;