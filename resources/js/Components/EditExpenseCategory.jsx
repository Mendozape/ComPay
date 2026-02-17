import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/expense_categories/';

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    }
};

/**
 * EditExpenseCategory Component
 * Fetches and updates an existing expense category name.
 */
export default function EditExpenseCategory() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { id } = useParams();
    const navigate = useNavigate();

    /**
     * Effect to fetch the current category data on component load
     */
    useEffect(() => {
        const getCategoryById = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${endpoint}${id}`, axiosOptions);
                setName(response.data.data.name);
            } catch (error) {
                toastr.error('Fallo al cargar la categoría.', 'Error');
            } finally {
                setLoading(false);
            }
        };
        getCategoryById();
    }, [id]);

    /**
     * Handler for final update confirmation via Modal
     */
    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await axios.put(`${endpoint}${id}`, { name: name.trim() }, axiosOptions);
            toastr.success('Categoría de gasto actualizada exitosamente.', 'Éxito');
            navigate('/expense_categories');
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toastr.error('Error de validación. Revise los campos.', 'Fallo');
            } else {
                const msg = error.response?.data?.message || 'Fallo al actualizar la categoría.';
                toastr.error(msg, 'Operación Fallida');
            }
        } finally {
            setIsSaving(false);
            setShowModal(false);
        }
    };

    /**
     * Trigger confirmation modal after local validation
     */
    const update = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toastr.warning('El nombre de la categoría es obligatorio.', 'Atención');
            setFormValidated(true);
            return;
        }
        setErrors({}); 
        setShowModal(true);
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos de la categoría...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-edit me-2"></i>Editar Categoría de Gasto</h2>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={update} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Nombre de la Categoría <span className="text-danger">*</span></label>
                            <input 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                type='text'
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                placeholder="Ej. Mantenimiento, Servicios, etc."
                                required
                            />
                            {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                        </div>

                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                <i className="fas fa-save me-2"></i>{isSaving ? 'Guardando...' : 'Actualizar Categoría'}
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/expense_categories')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-success text-white">
                            <h5 className="modal-title"><i className="fas fa-question-circle me-2"></i>Confirmar Actualización</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p className="mb-0">¿Está seguro de que desea actualizar el nombre de esta categoría?</p>
                        </div>
                        <div className="modal-footer bg-light justify-content-center">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success px-4" onClick={handleUpdate} disabled={isSaving}>
                                {isSaving ? 'Procesando...' : 'Confirmar y Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}