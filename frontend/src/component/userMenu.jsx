import { useState } from 'react';
function UserMenu({ name, onNavigate, onLogout }) {
    const [open, setOpen] = useState(false);
    const choose =(page) =>{ // let the app know that user not choosing any page
      onNavigate(page)
      setOpen(false);// close Menu
}
return (
    <div style={{position: ' relative'}}>
        <h1
        onClick={() => setOpen(!open)}
        style={{ margin: 0, fontSize: 20, cursor: 'pointer' }}
        >
            Welcome, {name}! 
        </h1>
        {open &&(
            <div
            style={{ position: 'absolute', top: '100%', marginTop: 6, display: 'flex', flexDirection: 'column', gap:4, padding:8, background: 'white', border: '1px solid #555', borderRadius: 6, zIndex:10, }}>
                <button onClick={() => choose('profile')}>Profile</button>
                <button onClick={() => choose('notification')}>Notification</button>
                <button onClick={() => { onLogout(); setOpen(false); }}>log out</button>
            </div>
            
        )}
    </div>
)
}
export default UserMenu;