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
} from "react-native";
import { useAuth } from "../context/AuthContext";

export function LoginScreen({ navigation, route }: any) {
  const roleType = route?.params?.role || "user"; // 'user' | 'organization' | 'admin'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      await login(email, password, roleType);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (roleType === "admin") return "Admin Login";
    if (roleType === "organization") return "Organization Login";
    return "User Login";
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inner}>
        <View style={styles.headerBox}>
          <Text style={styles.brandTitle}>CognifyAI</Text>
          <Text style={styles.roleTitle}>{getTitle()}</Text>
        </View>

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

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

        <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        {roleType !== "admin" && (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate("Signup", { role: roleType })}
          >
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        )}

        <View style={styles.roleSwitcher}>
          {roleType !== "user" && (
            <TouchableOpacity onPress={() => navigation.navigate("Login", { role: "user" })}>
              <Text style={styles.switchText}>Switch to User Login</Text>
            </TouchableOpacity>
          )}
          {roleType !== "organization" && (
            <TouchableOpacity onPress={() => navigation.navigate("Login", { role: "organization" })}>
              <Text style={styles.switchText}>Switch to Organization</Text>
            </TouchableOpacity>
          )}
          {roleType !== "admin" && (
            <TouchableOpacity onPress={() => navigation.navigate("Login", { role: "admin" })}>
              <Text style={styles.switchText}>Switch to Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  headerBox: { marginBottom: 32, alignItems: "center" },
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
  roleSwitcher: { marginTop: 40, borderTopWidth: 1, borderTopColor: "#1e293b", paddingTop: 16, flexDirection: "row", justifyContent: "space-around" },
  switchText: { color: "#64748b", fontSize: 12 },
});
