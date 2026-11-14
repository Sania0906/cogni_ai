import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

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
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
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
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  headerBox: { marginBottom: 32, alignItems: "center" },
  brandTitle: { fontSize: 32, fontWeight: "bold", color: colors.primary, marginBottom: 4 },
  roleTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  error: { color: colors.destructive, marginBottom: 16, textAlign: "center", fontSize: 13, fontWeight: "600" },
  inputContainer: { marginBottom: 16 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 15,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: { color: colors.textInverse, fontSize: 16, fontWeight: "700" },
  linkBtn: { marginTop: 20, alignItems: "center" },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  roleSwitcher: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderSubtle,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  switchText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
});
