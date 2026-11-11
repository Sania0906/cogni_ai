import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { BookOpen, Star, Clock, CheckCircle, ChevronRight, Award } from "lucide-react-native";

export function CoursesScreen({ navigation }: any) {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "AI/ML", "Programming", "Data Science", "Cloud"];

  const loadCoursesData = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.getCourses().catch(() => []),
        api.getMyCourses().catch(() => []),
      ]);

      const courseList = Array.isArray(allRes) ? allRes : allRes?.data || [];
      setCourses(courseList);

      const enrolledList = Array.isArray(myRes) ? myRes : myRes?.data || [];
      const map: Record<string, any> = {};
      enrolledList.forEach((e: any) => {
        const id = String(e.courseId || e.id);
        map[id] = e;
      });
      setEnrolledMap(map);
    } catch (e) {
      console.warn("Error loading courses:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCoursesData();
  }, []);

  const handleEnroll = async (courseId: string) => {
    try {
      await api.enrollCourse(courseId);
      Alert.alert("Enrolled!", "You have successfully enrolled in this course.");
      loadCoursesData();
    } catch (e: any) {
      Alert.alert("Enrollment", e?.response?.data?.message || "Successfully enrolled or already active.");
      loadCoursesData();
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (selectedCategory === "All") return true;
    const tags = Array.isArray(c.tags) ? c.tags.join(" ").toLowerCase() : "";
    return tags.includes(selectedCategory.toLowerCase());
  });

  return (
    <View style={styles.container}>
      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadCoursesData();
              }}
            />
          }
          renderItem={({ item }) => {
            const courseId = String(item.id || item._id);
            const enrollment = enrolledMap[courseId];
            const isEnrolled = !!enrollment;
            const progress = enrollment?.progress || 0;

            return (
              <TouchableOpacity
                style={styles.courseCard}
                onPress={() => navigation.navigate("CourseDetails", { courseId })}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseTitle}>{item.title}</Text>
                    <Text style={styles.instructorText}>Instructor: {item.author || "Industry Expert"}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Star color="#f59e0b" size={13} fill="#f59e0b" />
                    <Text style={styles.ratingText}>{item.rating || 4.8}</Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                  {item.description || "Comprehensive hands-on training curriculum for tech career advancement."}
                </Text>

                {/* Progress bar if enrolled */}
                {isEnrolled && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Course Progress</Text>
                      <Text style={styles.progressPct}>{progress}%</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${progress}%` }]} />
                    </View>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.footerMeta}>
                    <Clock color="#94a3b8" size={13} />
                    <Text style={styles.footerMetaText}>{item.weeks || 6} Weeks</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.footerMetaText}>{item.students || "10k"} students</Text>
                  </View>

                  {isEnrolled ? (
                    <View style={styles.enrolledBadge}>
                      <CheckCircle color="#10b981" size={14} />
                      <Text style={styles.enrolledBadgeText}>Enrolled</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.enrollBtn}
                      onPress={() => handleEnroll(courseId)}
                    >
                      <Text style={styles.enrollBtnText}>Enroll Free</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  categoryContainer: { backgroundColor: "#090d16", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  categoryScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
  catChipActive: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  catText: { color: "#94a3b8", fontSize: 13, fontWeight: "500" },
  catTextActive: { color: "#ffffff", fontWeight: "bold" },
  listContent: { padding: 16, paddingBottom: 40 },
  courseCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  courseTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  instructorText: { color: "#818cf8", fontSize: 13, marginTop: 2 },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { color: "#f59e0b", fontSize: 12, fontWeight: "bold", marginLeft: 4 },
  description: { color: "#94a3b8", fontSize: 13, marginTop: 10, lineHeight: 18 },
  progressContainer: { marginTop: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { color: "#94a3b8", fontSize: 12 },
  progressPct: { color: "#10b981", fontSize: 12, fontWeight: "bold" },
  barBg: { height: 6, backgroundColor: "#0f172a", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#10b981", borderRadius: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10 },
  footerMeta: { flexDirection: "row", alignItems: "center" },
  footerMetaText: { color: "#94a3b8", fontSize: 12, marginLeft: 4 },
  dot: { color: "#64748b", marginHorizontal: 6 },
  enrolledBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#065f46", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  enrolledBadgeText: { color: "#34d399", fontSize: 12, fontWeight: "600", marginLeft: 4 },
  enrollBtn: { backgroundColor: "#6366f1", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  enrollBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});

