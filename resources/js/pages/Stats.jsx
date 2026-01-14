// Stats.jsx (Updated version: 2 columns distribution)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import usePermission from '../hooks/usePermission'; 

axios.defaults.withCredentials = true;

const getCsrfToken = async () => {
    try {
        await axios.get('/sanctum/csrf-cookie');
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
    }
};

export default function Stats({ user }) { 
    const [userCount, setUserCount] = useState(0);
    const [roleCount, setRoleCount] = useState(0);

    // 1. Initialize permissions
    const { can } = usePermission(user);
    
    const canSeeUsers = can('Ver-usuarios');
    const canSeeRoles = can('Ver-roles');
    
    // Check if at least one of the remaining two boxes can be seen
    const canSeeAnyStats = canSeeUsers || canSeeRoles;
    
    useEffect(() => {
        if (!canSeeAnyStats) {
            setUserCount(0);
            setRoleCount(0);
            return; 
        }

        const fetchCounts = async () => {
            try {
                await getCsrfToken();
                const response = await axios.get('/api/users/count', {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });

                if (response.data) {
                    setUserCount(response.data.userCount || 0);
                    setRoleCount(response.data.roleCount || 0);
                }
            } catch (error) {
                console.error('Error fetching counts:', error);
                setUserCount(0);
                setRoleCount(0);
            }
        };

        fetchCounts();
    }, [canSeeAnyStats]);

    // Return null if no permissions found
    if (!canSeeAnyStats) {
        return null; 
    }

    return (
        <section className="section" align="center">
            <div className="section-body">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card shadow-none bg-transparent">
                            <div className="card-body">
                                <div className="row justify-content-center">
                                    
                                    {/* USER STATS BOX: col-md-6 for half-width distribution */}
                                    {canSeeUsers && (
                                        <div className="col-md-6 col-xl-6 mb-4">
                                            <div className="card bg-success text-white p-3 shadow border-0">
                                                <div className="card-subtitle">
                                                    <h5 className="font-weight-bold">Residentes en Sistema</h5>
                                                    <h2 className="text-left mt-3">
                                                        <i className="fa fa-users" />
                                                        <span style={{ float: 'right' }}>{userCount}</span>
                                                    </h2>
                                                    <div className="mt-4 text-right">
                                                        <a href="/users" className="btn btn-sm btn-light text-success font-weight-bold">
                                                            Gestionar Residentes <i className="fas fa-arrow-circle-right ml-1"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* ROLES STATS BOX: col-md-6 for half-width distribution */}
                                    {canSeeRoles && (
                                        <div className="col-md-6 col-xl-6 mb-4">
                                            <div className="card bg-info text-white p-3 shadow border-0">
                                                <div className="card-subtitle">
                                                    <h5 className="font-weight-bold">Roles de Residente</h5>
                                                    <h2 className="text-left mt-3">
                                                        <i className="fa fa-user-lock" />
                                                        <span style={{ float: 'right' }}>{roleCount}</span>
                                                    </h2>
                                                    <div className="mt-4 text-right">
                                                        <a href="/roles" className="btn btn-sm btn-light text-info font-weight-bold">
                                                            Configurar Roles <i className="fas fa-arrow-circle-right ml-1"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}