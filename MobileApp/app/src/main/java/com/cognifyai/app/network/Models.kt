package com.cognifyai.app.network

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String
)

data class AuthResponse(
    val user: UserData?,
    val token: String?,
    val error: String?
)

data class UserData(
    val id: String,
    val email: String
)

data class ProfileResponse(
    val id: String,
    val full_name: String,
    val title: String,
    val bio: String
)
