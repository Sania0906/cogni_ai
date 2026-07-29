package com.cognifyai.app.repository

import com.cognifyai.app.network.ApiClient
import com.cognifyai.app.network.LoginRequest
import com.cognifyai.app.network.RegisterRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository {
    suspend fun login(request: LoginRequest) = withContext(Dispatchers.IO) {
        val response = ApiClient.apiService.login(request)
        if (response.isSuccessful) Result.success(response.body()) else Result.failure(Exception("Login failed: ${response.code()}"))
    }

    suspend fun register(request: RegisterRequest) = withContext(Dispatchers.IO) {
        val response = ApiClient.apiService.register(request)
        if (response.isSuccessful) Result.success(response.body()) else Result.failure(Exception("Registration failed: ${response.code()}"))
    }
}
