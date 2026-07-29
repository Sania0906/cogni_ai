package com.cognifyai.app

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cognifyai.app.network.RegisterRequest
import com.cognifyai.app.repository.AuthRepository
import kotlinx.coroutines.launch

class SignupActivity : AppCompatActivity() {
    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_signup)

        val nameInput = findViewById<EditText>(R.id.nameInput)
        val emailInput = findViewById<EditText>(R.id.emailInput)
        val passwordInput = findViewById<EditText>(R.id.passwordInput)
        val signupButton = findViewById<Button>(R.id.signupButton)

        signupButton.setOnClickListener {
            val name = nameInput.text.toString()
            val email = emailInput.text.toString()
            val password = passwordInput.text.toString()
            
            lifecycleScope.launch {
                val result = authRepository.register(RegisterRequest(name, email, password))
                if (result.isSuccess) {
                    Toast.makeText(this@SignupActivity, "Signup successful", Toast.LENGTH_SHORT).show()
                    finish()
                } else {
                    Toast.makeText(this@SignupActivity, "Signup failed", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
