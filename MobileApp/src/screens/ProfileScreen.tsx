import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { colors } from "../theme/colors";
import {
  User,
  Mail,
  Briefcase,
  Save,
  CheckCircle,
  FileText,
  ChevronRight,
  Bookmark,
  LogOut,
  Phone,
  GraduationCap,
} from "lucide-react-native";

export function ProfileScreen({ navigation }: any) {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [phone, setPhone] = useState("");
  const [degree, setDegree] = useState("");
  const [college, setCollege] = useState("");
  const [resumeDetails, setResumeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      const interval = setInterval(loadProfile, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      const profile = data?.data || data;
      if (profile?.name || profile?.full_name) setName(profile.name || profile.full_name);
      if (profile?.headline) setHeadline(profile.headline);
      if (profile?.bio) setBio(profile.bio);
      if (profile?.phone) setPhone(profile.phone);
      if (profile?.degree) setDegree(profile.degree);
      if (profile?.college) setCollege(profile.college);
      if (profile?.target_role || profile?.targetRole) {
        setTargetRole(profile.target_role || profile.targetRole);
      }
      if (profile?.resumeDetails) {
        setResumeDetails(profile.resumeDetails);
      }
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
      await api.updateProfile({
        name: name.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        target_role: targetRole.trim(),
        phone: phone.trim(),
        degree: degree.trim(),
        college: college.trim(),
      });
      // Synchronize context and persistent storage immediately
      await refreshUser();
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar Header */}
      <View style={styles.avatarBox}>
        <View style={styles.avatarCircle}>
          <User color={colors.primary} size={40} />
        </View>
        <Text style={styles.roleBadge}>{user?.role || "user"}</Text>
      </View>

      {/* Main Profile Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Personal Information</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address (Read-only)</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={user?.email || ""}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Professional Headline</Text>
          <TextInput
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            placeholder="e.g. Senior Full Stack Engineer | React & Node.js"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Target Career Role</Text>
          <TextInput
            style={styles.input}
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="e.g. Software Engineer / Data Scientist"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio / Executive Summary</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell recruiters and peers about your background and technical passions..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Academic Background Card */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardHeader}>Academic Background</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Degree / Highest Qualification</Text>
          <TextInput
            style={styles.input}
            value={degree}
            onChangeText={setDegree}
            placeholder="e.g. B.Tech Computer Science"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>College / University</Text>
          <TextInput
            style={styles.input}
            value={college}
            onChangeText={setCollege}
            placeholder="e.g. Stanford University"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.btnRow}>
            <Save color="#ffffff" size={18} />
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Resume Management Section */}
      <View style={styles.card}>
        <View style={styles.resumeHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FileText color={colors.primary} size={20} />
            <Text style={styles.resumeTitle}>Resume Status</Text>
          </View>
          {resumeDetails ? (
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Uploaded</Text>
            </View>
          ) : (
            <View style={[styles.badgeSuccess, { backgroundColor: colors.disabledBg }]}>
              <Text style={[styles.badgeSuccessText, { color: colors.textSecondary }]}>None</Text>
            </View>
          )}
        </View>

        {resumeDetails ? (
          <View style={{ marginTop: 14 }}>
            <View style={styles.resumeRow}>
              <Text style={styles.resumeLabel}>Filename</Text>
              <Text style={styles.resumeVal} numberOfLines={1}>{resumeDetails.file_name || "resume.pdf"}</Text>
            </View>
            <View style={styles.resumeRow}>
              <Text style={styles.resumeLabel}>ATS Score</Text>
              <Text style={[styles.resumeVal, { color: colors.primary, fontWeight: "bold" }]}>
                {resumeDetails.ats_score ? `${resumeDetails.ats_score}%` : "Analyzed"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() => navigation.navigate("Resume")}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeBtnText}>Manage & Replace Resume</Text>
              <ChevronRight color="#ffffff" size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 14, lineHeight: 18 }}>
              No resume uploaded yet. Upload a resume to enable AI ATS scoring and Career Matching.
            </Text>
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() => navigation.navigate("Resume")}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeBtnText}>Upload Resume</Text>
              <ChevronRight color="#ffffff" size={16} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account & Shortcuts Section */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Shortcuts</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate("SavedJobs")}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Bookmark color="#0284c7" size={18} />
            <Text style={styles.actionRowText}>Saved Job Bookmarks</Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={16} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate("ResumeHistory")}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FileText color="#9333ea" size={18} />
            <Text style={styles.actionRowText}>Resume Audit History</Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={16} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={() => {
            Alert.alert("Confirm Sign Out", "Are you sure you want to log out of CognifyAI?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: logout },
            ]);
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <LogOut color={colors.destructive} size={18} />
            <Text style={[styles.actionRowText, { color: colors.destructive }]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 50 },
  avatarBox: { alignItems: "center", marginVertical: 16 },
  avatarCircle: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  roleBadge: {
    color: colors.primary,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 10,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  formGroup: { marginBottom: 14 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 14,
  },
  disabledInput: { backgroundColor: colors.disabledBg, color: colors.textMuted },
  textArea: { height: 90 },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  saveBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15, marginLeft: 8 },
  resumeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderSubtle,
    paddingBottom: 10,
  },
  resumeTitle: {
    color: colors.textPrimary,
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 8,
  },
  badgeSuccess: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccessText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  resumeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderSubtle,
  },
  resumeLabel: { color: colors.textSecondary, fontSize: 13 },
  resumeVal: { color: colors.textPrimary, fontSize: 13, maxWidth: "60%" },
  resumeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  resumeBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14, marginRight: 6 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderSubtle,
  },
  actionRowText: { color: colors.textPrimary, marginLeft: 10, fontSize: 14, fontWeight: "600" },
});
