import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { User, Mail, Briefcase, Save, CheckCircle } from "lucide-react-native";

export function ProfileScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      const profile = data?.data || data;
      if (profile?.name || profile?.full_name) setName(profile.name || profile.full_name);
      if (profile?.headline) setHeadline(profile.headline);
      if (profile?.bio) setBio(profile.bio);
    } catch (e) {
      console.warn("Error loading user profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), headline: headline.trim(), bio: bio.trim() });
      Alert.alert("Success", "Profile updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarBox}>
        <View style={styles.avatarCircle}>
          <User color="#818cf8" size={40} />
        </View>
        <Text style={styles.roleBadge}>{user?.role || "user"}</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Email (Read-only)</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={user?.email || ""}
          editable={false}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Professional Headline</Text>
        <TextInput
          style={styles.input}
          value={headline}
          onChangeText={setHeadline}
          placeholder="e.g. Senior Full Stack Engineer | React & Node.js"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Bio / Executive Summary</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell recruiters and peers about your background and technical passions..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.btnRow}>
            <Save color="#ffffff" size={18} />
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  center: { flex: 1, backgroundColor: "#090d16", justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 40 },
  avatarBox: { alignItems: "center", marginVertical: 20 },
  avatarCircle: {
    backgroundColor: "#1e293b",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#6366f1",
  },
  roleBadge: {
    color: "#a5b4fc",
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 10,
    textTransform: "uppercase",
  },
  formGroup: { marginBottom: 16 },
  label: { color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: "500" },
  input: {
    backgroundColor: "#1e293b",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 15,
  },
  disabledInput: { backgroundColor: "#0f172a", color: "#64748b" },
  textArea: { height: 100 },
  saveBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  saveBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 16, marginLeft: 8 },
});

