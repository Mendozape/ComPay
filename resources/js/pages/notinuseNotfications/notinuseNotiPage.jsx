import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

// Configure Axios
axios.defaults.withCredentials = true;

const getCsrfToken = async () => {
    try {
        await axios.get('/sanctum/csrf-cookie');
        console.log('CSRF token fetched successfully');
    } catch (error) {
        console.error('Error fetching CSRF token: ', error);
    }
};

export default function NotiPage() {
    const [countNotis, setCountNotis] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const fetchNotiStatus = async () => {
            try {
                await getCsrfToken();
                const response = await axios.get('/api/notis/countNotis', {
                    headers: {
                        'Accept': 'application/json',
                    },
                });

                if (response.data && response.data.countNotis) {
                    setCountNotis(Object.values(response.data.countNotis));
                } else {
                    setCountNotis([]);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
                setCountNotis([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNotiStatus();
    }, []);

    if (loading) return <p>Cargando notificaciones...</p>;

    return (
        <div>
            <div>
                <h3>Notificaciones</h3>
            </div>

            <div className='d-flex'>
                {/* Sidebar with list of notifications */}
                <div>
                    <ul>
                        {countNotis.map((row) => (
                            <li key={row.id}>
                                <NavLink
                                    to={row.id}
                                    className={({ isActive }) =>
                                        isActive ? 'text-danger' : ''
                                    }
                                >
                                    {row.data?.name || 'Notificación sin nombre'}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Detail view */}
                <div className='ml-4' style={{ flex: 1 }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}