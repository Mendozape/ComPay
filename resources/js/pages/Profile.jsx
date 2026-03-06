import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * Returns the correct profile photo URL or a default avatar
 * Includes a timestamp to bypass browser cache.
 */
const getProfilePhotoUrl = (profile) => {
    const defaultUrl = "/default-avatar.png";
    if (profile.profile_photo_path) {
        return `/storage/images/${profile.profile_photo_path}?t=${Date.now()}`;
    }
    return defaultUrl;
};

/**
 * Profile Component
 * Handles user profile information, security, and photo updates.
 */
const Profile = () => {
    // --- STATE VARIABLES ---
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        password_confirmation: "",
        profile_photo_path: null,
    });

    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Fetch authenticated user data on component mount
     */
    useEffect(() => {
        axios
            .get("/api/user")
            .then((res) => {
                setProfile((prev) => ({
                    ...prev,
                    name: res.data.name || "",
                    email: res.data.email || "",
                    phone: res.data.phone || "",
                    profile_photo_path: res.data.profile_photo_path,
                }));
            })
            .catch((err) => {
                console.error("Fetch profile error:", err);
                toastr.error("No se pudo cargar la información del perfil.", "Error");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    /**
     * Handle text input changes
     */
    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    /**
     * Handle profile photo selection and preview generation
     */
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    /**
     * Submit profile update via Multipart FormData
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append("name", profile.name);
            formData.append("email", profile.email);
            formData.append("phone", profile.phone || "");

            // Only send password fields if user entered data
            if (profile.password) {
                formData.append("password", profile.password);
                formData.append("password_confirmation", profile.password_confirmation);
            }

            // Append photo file if selected
            if (photo) {
                formData.append("photo", photo);
            }

            const response = await axios.post("/api/profile/update", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const updatedUser = response.data.user;

            // Update local state with fresh data
            setProfile((prev) => ({
                ...prev,
                name: updatedUser.name,
                profile_photo_path: updatedUser.profile_photo_path,
                password: "",
                password_confirmation: "",
            }));

            setPhoto(null);
            setPreview(null);
            
            // --- SUCCESS NOTIFICATION ---
            toastr.success("Perfil actualizado exitosamente.", "Éxito");

            // Global sync for Navbar/Sidebar
            const freshPhoto = `/storage/images/${updatedUser.profile_photo_path}?t=${Date.now()}`;
            window.dispatchEvent(new CustomEvent("profileUpdated", { 
                detail: { name: updatedUser.name, photo: freshPhoto } 
            }));

        } catch (err) {
            console.error("Profile update error:", err);
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors);
                toastr.warning("Por favor revisa los errores en el formulario.", "Validación");
            } else {
                toastr.error("Ocurrió un error al intentar guardar los cambios.", "Error");
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando perfil...</p>
        </div>
    );

    const finalPhotoUrl = preview || getProfilePhotoUrl(profile);

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        {/* Standardized Success Green Header */}
                        <div className="card-header bg-success text-white p-3">
                            <h2 className="mb-0 h4">
                                <i className="fas fa-user-circle me-2"></i>Mi Perfil
                            </h2>
                        </div>

                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                
                                {/* Profile Photo Section */}
                                <div className="text-center mb-4">
                                    <div className="position-relative d-inline-block" style={{ width: "140px", height: "140px" }}>
                                        <img
                                            key={finalPhotoUrl}
                                            src={finalPhotoUrl}
                                            alt="Perfil"
                                            className="rounded-circle border shadow-sm"
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                        <label
                                            htmlFor="photo"
                                            className="btn btn-sm btn-info text-white position-absolute rounded-circle shadow"
                                            style={{ 
                                                bottom: "5px", 
                                                right: "5px", 
                                                width: "35px", 
                                                height: "35px", 
                                                display: "flex", 
                                                alignItems: "center", 
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                zIndex: 10
                                            }}
                                        >
                                            <i className="fas fa-camera"></i>
                                        </label>
                                    </div>
                                    <input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="d-none" />
                                    <p className="text-muted small mt-2">Haz clic en la cámara para cambiar tu foto</p>
                                </div>

                                {/* User Information */}
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Nombre completo <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                        value={profile.name}
                                        onChange={handleChange}
                                        required
                                    />
                                    {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold">Correo electrónico</label>
                                    <input type="email" className="form-control bg-light" value={profile.email} readOnly />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold">Teléfono</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                                        value={profile.phone}
                                        onChange={handleChange}
                                    />
                                    {errors.phone && <div className="invalid-feedback">{errors.phone[0]}</div>}
                                </div>

                                <hr />
                                <h6 className="text-muted mb-3">Seguridad</h6>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Nueva contraseña</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                            value={profile.password}
                                            onChange={handleChange}
                                            placeholder="Opcional"
                                        />
                                        {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Confirmar contraseña</label>
                                        <input
                                            type="password"
                                            name="password_confirmation"
                                            className="form-control"
                                            value={profile.password_confirmation}
                                            onChange={handleChange}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-3 border-top">
                                    <button 
                                        type="submit" 
                                        className="btn btn-success w-100 fw-bold py-2 shadow-sm" 
                                        disabled={isSaving}
                                    >
                                        <i className="fas fa-save me-2"></i>
                                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;