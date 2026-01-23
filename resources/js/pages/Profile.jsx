import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * Returns the correct profile photo URL or a default avatar
 */
const getProfilePhotoUrl = (profile) => {
    const defaultUrl = "/default-avatar.png";

    if (profile.profile_photo_path) {
        return `/storage/images/${profile.profile_photo_path}`;
    }

    return defaultUrl;
};

const Profile = () => {
    /**
     * Unified profile state
     * Includes optional password fields
     */
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
    const [status, setStatus] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);

    /**
     * Fetch authenticated user data
     */
    useEffect(() => {
        axios
            .get("/api/user")
            .then((res) => {
                setProfile((prev) => ({
                    ...prev,
                    name: res.data.name,
                    email: res.data.email,
                    phone: res.data.phone || "",
                    profile_photo_path: res.data.profile_photo_path,
                }));
                setLoading(false);
            })
            .catch(() => {
                setErrors({ general: "No se pudo cargar la información del perfil." });
                setLoading(false);
            });
    }, []);

    /**
     * Auto-hide success and error messages
     */
    useEffect(() => {
        if (status || errors.general) {
            const timer = setTimeout(() => {
                setStatus("");
                setErrors({});
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [status, errors]);

    /**
     * Handle text input changes
     */
    const handleChange = (e) => {
        setProfile({
            ...profile,
            [e.target.name]: e.target.value,
        });
    };

    /**
     * Handle profile photo selection and preview
     */
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        setPhoto(file);

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    /**
     * Submit profile update
     * Password is optional
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("");
        setErrors({});

        // Optional frontend password validation
        if (profile.password.length > 0) {
            if (profile.password.length < 6) {
                setErrors({
                    password: ["La contraseña debe tener al menos 6 caracteres."],
                });
                return;
            }

            if (profile.password !== profile.password_confirmation) {
                setErrors({
                    password_confirmation: ["Las contraseñas no coinciden."],
                });
                return;
            }
        }

        try {
            const formData = new FormData();

            formData.append("name", profile.name);
            formData.append("email", profile.email);
            formData.append("phone", profile.phone || "");

            // Only send password if user entered one
            if (profile.password.length > 0) {
                formData.append("password", profile.password);
                formData.append(
                    "password_confirmation",
                    profile.password_confirmation
                );
            }

            // Append photo only if selected
            if (photo) {
                formData.append("photo", photo);
            }

            const response = await axios.post(
                "/api/profile/update",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setStatus(response.data.message || "Perfil actualizado correctamente.");

            // Reset password fields after success
            setProfile((prev) => ({
                ...prev,
                password: "",
                password_confirmation: "",
            }));

            setPhoto(null);
            setPreview(null);
        } catch (err) {
            // 🔥 IMPORTANT: show real backend error
            console.error("PROFILE UPDATE ERROR:", err);
            console.error("BACKEND RESPONSE:", err.response);

            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setErrors({
                    general:
                        err.response?.data?.message ||
                        "Error interno del servidor",
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="text-center mt-5">
                Cargando información del perfil...
            </div>
        );
    }

    const finalPhotoUrl = preview || getProfilePhotoUrl(profile);

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">

                    {status && (
                        <div className="alert alert-success text-center">
                            {status}
                        </div>
                    )}

                    {errors.general && (
                        <div className="alert alert-danger text-center">
                            {errors.general}
                        </div>
                    )}

                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-success text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-user-circle me-2"></i>
                                Mi Perfil
                            </h5>
                        </div>

                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>

                                {/* PROFILE PHOTO */}
                                <div className="text-center mb-4">
                                    <div className="position-relative d-inline-block">
                                        <img
                                            src={finalPhotoUrl}
                                            alt="Perfil"
                                            className="rounded-circle border"
                                            style={{
                                                width: "140px",
                                                height: "140px",
                                                objectFit: "cover",
                                            }}
                                        />
                                        <label
                                            htmlFor="photo"
                                            className="btn btn-sm btn-info text-white position-absolute bottom-0 end-0 rounded-circle"
                                        >
                                            <i className="fas fa-camera"></i>
                                        </label>
                                    </div>
                                    <input
                                        id="photo"
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="d-none"
                                    />
                                </div>

                                {/* BASIC INFO */}
                                <div className="mb-3">
                                    <label className="form-label">Nombre completo</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                        value={profile.name}
                                        onChange={handleChange}
                                    />
                                    {errors.name && (
                                        <div className="invalid-feedback">
                                            {errors.name[0]}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Correo electrónico</label>
                                    <input
                                        type="email"
                                        className="form-control bg-light"
                                        value={profile.email}
                                        readOnly
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                                        value={profile.phone}
                                        onChange={handleChange}
                                    />
                                    {errors.phone && (
                                        <div className="invalid-feedback">
                                            {errors.phone[0]}
                                        </div>
                                    )}
                                </div>

                                {/* SECURITY SECTION */}
                                <hr />
                                <h6 className="text-muted">Seguridad</h6>

                                <div className="mb-3">
                                    <label className="form-label">
                                        Nueva contraseña (opcional)
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                        value={profile.password}
                                        onChange={handleChange}
                                        placeholder="Déjalo vacío para mantener la actual"
                                    />
                                    {errors.password && (
                                        <div className="invalid-feedback">
                                            {errors.password[0]}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">
                                        Confirmar nueva contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        className={`form-control ${errors.password_confirmation ? "is-invalid" : ""}`}
                                        value={profile.password_confirmation}
                                        onChange={handleChange}
                                    />
                                    {errors.password_confirmation && (
                                        <div className="invalid-feedback">
                                            {errors.password_confirmation[0]}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-success w-100 fw-bold mt-3"
                                >
                                    <i className="fas fa-save me-2"></i>
                                    Guardar cambios
                                </button>

                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
