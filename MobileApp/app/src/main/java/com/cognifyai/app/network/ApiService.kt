package com.cognifyai.app.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.GET
import retrofit2.http.Header

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @GET("profile")
    suspend fun getProfile(@Header("Authorization") token: String): Response<ProfileResponse>
    
    // Add ATS, Dashboard, Resume Uploading endpoints here for Phase 2
}
