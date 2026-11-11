import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export function SignupScreen({ navigation, route }: any) {
  const roleType = route?.params?.role || "user"; // 'user' | 'organization'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password, roleType);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerBox}>
            <Text style={styles.brandTitle}>CognifyAI</Text>
            <Text style={styles.roleTitle}>
              {roleType === "organization" ? "Organization Signup" : "User Registration"}
            </Text>
          </View>

          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{roleType === "organization" ? "Organization Name" : "Full Name"}</Text>
            <TextInput
              style={styles.input}
              placeholder={roleType === "organization" ? "Acme Corp" : "John Doe"}
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate("Login", { role: roleType })}
          >
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  inner: { flex: 1 },
  scrollContent: { padding: 24, justifyContent: "center", minHeight: "100%" },
  headerBox: { marginBottom: 28, alignItems: "center" },
  brandTitle: { fontSize: 32, fontWeight: "bold", color: "#6366f1", marginBottom: 4 },
  roleTitle: { fontSize: 20, fontWeight: "600", color: "#e2e8f0" },
  error: { color: "#ef4444", marginBottom: 16, textAlign: "center" },
  inputContainer: { marginBottom: 16 },
  label: { color: "#94a3b8", fontSize: 14, marginBottom: 6 },
  input: {
    backgroundColor: "#1e293b",
    color: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 16,
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  btnText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  linkBtn: { marginTop: 20, alignItems: "center" },
  linkText: { color: "#818cf8", fontSize: 14 },
});
