import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// Always include credentials (cookies) in Axios requests
axios.defaults.withCredentials = true;

// Get CSRF token from Laravel Sanctum
const getCsrfToken = async () => {
  try {
    await axios.get('/sanctum/csrf-cookie');
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
  }
};

export default function NotiProfile() {
  const { id } = useParams(); // React Router param (must match :id in router)
  const [notiList, setNotiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        await getCsrfToken();

        // Update the endpoint below if your Laravel route is different
        const response = await axios.get(`/api/notis/notis/${id}`, {
          headers: { Accept: 'application/json' },
        });

        console.log('Notification response:', response.data);

        if (response.data && response.data.noti) {
          // Convert object into array if needed
          const valuesArray = Object.values(response.data.noti);
          setNotiList(valuesArray);
        } else {
          setNotiList([]);
        }
      } catch (err) {
        console.error('Error fetching notification:', err);
        setError('Fallo al cargar la notificación.');
        setNotiList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotification();
  }, [id]);

  if (isLoading) return <p>Cargando notificación...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!notiList.length) return <p>No se encontró ninguna notificación.</p>;

  return (
    <div>
      {notiList.map((item) => (
        <div
          key={item.id}
          style={{
            border: '1px solid #ccc',
            borderRadius: '6px',
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f9f9f9',
          }}
        >
          <p><strong>ID:</strong> {item.id}</p>
          <p><strong>Nombre:</strong> {item.data?.name || 'Sin nombre'}</p>
          <p><strong>Creado el:</strong> {item.created_at}</p>
          {/* Add more fields as needed */}
        </div>
      ))}
    </div>
  );
}