import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * FINAL LOGIC: Uses the 'profile_photo_path' field from the database 
 * and concatenates it directly after the public storage URL.
 */
const getProfilePhotoUrl = (profile) => {
    const defaultUrl = "/default-avatar.png";
    const photoPath = profile.profile_photo_path;
    if (photoPath) {
        return `/storage/images/${photoPath}`;
    }
    return defaultUrl;
};

const Profile = ({ user }) => {
    const [profile, setProfile] = useState(user || {});
    const [passwords, setPasswords] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState("");
    const [errors, setErrors] = useState({});

    /**
     * 🛡️ AUTO-HIDE MESSAGES EFFECT
     */
    useEffect(() => {
        if (status || errors.general) {
            const timer = setTimeout(() => {
                setStatus("");
                setErrors((prev) => ({ ...prev, general: "" }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [status, errors.general]);

    // Fetch user info on component mount
    useEffect(() => {
        if (!user) {
            axios
                .get("/api/user")
                .then((res) => {
                    setProfile(res.data);
                })
                .catch((err) => console.error("Failed to fetch user:", err));
        }
    }, [user]);

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

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

    const updateProfile = async (e) => {
        e.preventDefault();
        setStatus("");
        setErrors({});

        try {
            const formData = new FormData();
            formData.append("name", profile.name);
            formData.append("email", profile.email);
            if (photo) formData.append("photo", photo);

            const response = await axios.post("/api/profile/update", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setStatus(response.data.message);

            const res = await axios.get("/api/user");
            setProfile(res.data);
            setPhoto(null);
            setPreview(null);
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setErrors({ general: "Error al actualizar el perfil." });
            }
        }
    };

    const updatePassword = async (e) => {
        e.preventDefault();
        setStatus("");
        setErrors({});

        try {
            await axios.put("/user/password", passwords);
            setStatus("Contraseña actualizada exitosamente.");
            setPasswords({
                current_password: "",
                password: "",
                password_confirmation: "",
            });
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setErrors({ general: "Error al actualizar la contraseña." });
            }
        }
    };

    if (!profile) return <div className="text-center mt-5">Cargando información del usuario...</div>;

    const finalPhotoUrl = getProfilePhotoUrl(profile);

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    {status && <div className="alert alert-success text-center py-2 shadow-sm">{status}</div>}
                    {errors.general && <div className="alert alert-danger text-center py-2 shadow-sm">{errors.general}</div>}

                    {/* Profile Information Card */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-success text-white p-3">
                            <h5 className="mb-0"><i className="fas fa-user-circle me-2"></i>Información del Perfil</h5>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={updateProfile}>
                                <div className="text-center mb-4">
                                    <div className="position-relative d-inline-block">
                                        <img
                                            src={preview || finalPhotoUrl}
                                            alt="Profile"
                                            className="rounded-circle border shadow-sm"
                                            style={{
                                                width: "140px",
                                                height: "140px",
                                                objectFit: "cover",
                                                border: "4px solid #fff"
                                            }}
                                        />
                                        <label
                                            htmlFor="photo"
                                            className="btn btn-sm btn-info text-white position-absolute bottom-0 end-0 rounded-circle shadow"
                                            style={{ width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            <i className="fas fa-camera"></i>
                                        </label>
                                    </div>
                                    <input
                                        id="photo"
                                        type="file"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="d-none"
                                    />
                                    {errors.photo && (
                                        <div className="text-danger small mt-2">{errors.photo[0]}</div>
                                    )}
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Nombre Completo</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                            value={profile.name || ""}
                                            onChange={handleProfileChange}
                                            placeholder="Tu nombre"
                                        />
                                        {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                            value={profile.email || ""}
                                            onChange={handleProfileChange}
                                            placeholder="correo@ejemplo.com"
                                        />
                                        {errors.email && <div className="invalid-feedback">{errors.email[0]}</div>}
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-success w-100 py-2 mt-2 fw-bold shadow-sm">
                                    <i className="fas fa-save me-2"></i>Guardar Cambios del Perfil
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="card shadow-sm border-0 mb-5">
                        <div className="card-header bg-info text-white p-3">
                            <h5 className="mb-0"><i className="fas fa-lock me-2"></i>Seguridad y Contraseña</h5>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={updatePassword}>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Contraseña Actual</label>
                                    <input
                                        type="password"
                                        name="current_password"
                                        className={`form-control ${errors.current_password ? "is-invalid" : ""}`}
                                        value={passwords.current_password}
                                        onChange={handlePasswordChange}
                                    />
                                    {errors.current_password && (
                                        <div className="invalid-feedback">{errors.current_password[0]}</div>
                                    )}
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                            value={passwords.password}
                                            onChange={handlePasswordChange}
                                        />
                                        {errors.password && (
                                            <div className="invalid-feedback">{errors.password[0]}</div>
                                        )}
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Confirmar Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            name="password_confirmation"
                                            className="form-control"
                                            value={passwords.password_confirmation}
                                            onChange={handlePasswordChange}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-outline-info w-100 py-2 fw-bold mt-2">
                                    <i className="fas fa-key me-2"></i>Actualizar Contraseña
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