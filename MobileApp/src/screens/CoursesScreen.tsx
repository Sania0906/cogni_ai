import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import {
  BookOpen,
  Star,
  Clock,
  CheckCircle,
  ChevronRight,
  PlayCircle,
  GraduationCap,
} from "lucide-react-native";
import { colors } from "../theme/colors";

export function CoursesScreen({ navigation }: any) {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, any>>({});
  const [enrolledList, setEnrolledList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "In Progress", "Completed", "AI/ML", "Programming", "Data Science", "Cloud"];

  const loadCoursesData = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.getCourses().catch(() => []),
        api.getMyCourses().catch(() => []),
      ]);

      const courseList = Array.isArray(allRes) ? allRes : allRes?.data || [];
      setCourses(courseList);

      const enrolled = Array.isArray(myRes) ? myRes : myRes?.data || [];
      setEnrolledList(enrolled);

      const map: Record<string, any> = {};
      enrolled.forEach((e: any) => {
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

  useFocusEffect(
    useCallback(() => {
      loadCoursesData();
      const interval = setInterval(loadCoursesData, 10000);
      return () => clearInterval(interval);
    }, [])
  );

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

  const handleContinueLearning = (courseId: string, courseTitle?: string) => {
    const enrollment = enrolledMap[courseId];
    const completed = enrollment?.completedLessons || 0;
    const nextLessonId = `l${Math.min(6, completed + 1)}`;
    navigation.navigate("Lesson", {
      lessonId: nextLessonId,
      courseId,
      courseTitle: courseTitle || enrollment?.title || "Course Curriculum",
    });
  };

  const activeEnrolledCourse = enrolledList.length > 0 ? enrolledList[0] : null;

  const filteredCourses = courses.filter((c) => {
    const courseId = String(c.id || c._id);
    const enrollment = enrolledMap[courseId];
    if (selectedCategory === "All") return true;
    if (selectedCategory === "In Progress") return enrollment && (enrollment.progress || 0) < 100;
    if (selectedCategory === "Completed") return enrollment && (enrollment.progress || 0) >= 100;

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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
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
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            activeEnrolledCourse ? (
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.heroBadge}>
                    <GraduationCap color={colors.primary} size={16} />
                    <Text style={styles.heroBadgeText}>CONTINUE LEARNING</Text>
                  </View>
                  <Text style={styles.heroProgress}>{activeEnrolledCourse.progress || 0}%</Text>
                </View>

                <Text style={styles.heroTitle}>{activeEnrolledCourse.title}</Text>
                <Text style={styles.heroSubtitle}>
                  {activeEnrolledCourse.completedLessons || 0} of {activeEnrolledCourse.totalLessons || 6} lessons completed
                </Text>

                <View style={styles.heroBarBg}>
                  <View style={[styles.heroBarFill, { width: `${Math.max(5, activeEnrolledCourse.progress || 0)}%` }]} />
                </View>

                <TouchableOpacity
                  style={styles.heroCta}
                  onPress={() => handleContinueLearning(String(activeEnrolledCourse.courseId || activeEnrolledCourse.id), activeEnrolledCourse.title)}
                  activeOpacity={0.8}
                >
                  <PlayCircle color="#ffffff" size={18} />
                  <Text style={styles.heroCtaText}>Continue Learning</Text>
                  <ChevronRight color="#ffffff" size={16} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const courseId = String(item.id || item._id);
            const enrollment = enrolledMap[courseId];
            const isEnrolled = !!enrollment;
            const progress = enrollment?.progress || 0;
            const isCompleted = progress >= 100;

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
                    <Star color={colors.warning} size={13} fill={colors.warning} />
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
                      <Text style={styles.progressLabel}>
                        {isCompleted ? "Course Completed" : "Current Progress"}
                      </Text>
                      <Text style={[styles.progressPct, isCompleted && { color: colors.success }]}>
                        {progress}%
                      </Text>
                    </View>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${progress}%` },
                          isCompleted && { backgroundColor: colors.success },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.footerMeta}>
                    <Clock color={colors.textSecondary} size={13} />
                    <Text style={styles.footerMetaText}>{item.weeks || 6} Weeks</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.footerMetaText}>{item.students || "10k"} students</Text>
                  </View>

                  {isEnrolled ? (
                    <TouchableOpacity
                      style={[styles.continueBtn, isCompleted && styles.completedBtn]}
                      onPress={() => handleContinueLearning(courseId, item.title)}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle color={colors.success} size={14} />
                          <Text style={styles.completedBtnText}>Review</Text>
                        </>
                      ) : (
                        <>
                          <PlayCircle color="#ffffff" size={14} />
                          <Text style={styles.continueBtnText}>Continue</Text>
                        </>
                      )}
                    </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.background },
  categoryContainer: {
    backgroundColor: colors.headerBg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBorder,
  },
  categoryScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  catTextActive: { color: colors.textInverse, fontWeight: "bold" },
  listContent: { padding: 16, paddingBottom: 40 },

  // Hero Card for Continue Learning
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorderSubtle,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: { color: colors.primary, fontSize: 11, fontWeight: "700", marginLeft: 4 },
  heroProgress: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  heroTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "bold", marginTop: 8 },
  heroSubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  heroBarBg: { height: 6, backgroundColor: colors.backgroundSecondary, borderRadius: 3, overflow: "hidden", marginVertical: 12 },
  heroBarFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  heroCta: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  heroCtaText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },

  // Course Card
  courseCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  courseTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold" },
  instructorText: { color: colors.primary, fontSize: 13, marginTop: 2 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: { color: colors.warning, fontSize: 12, fontWeight: "bold", marginLeft: 4 },
  description: { color: colors.textSecondary, fontSize: 13, marginTop: 10, lineHeight: 18 },
  progressContainer: { marginTop: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { color: colors.textSecondary, fontSize: 12 },
  progressPct: { color: colors.primary, fontSize: 12, fontWeight: "bold" },
  barBg: { height: 6, backgroundColor: colors.backgroundSecondary, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderSubtle,
    paddingTop: 10,
  },
  footerMeta: { flexDirection: "row", alignItems: "center" },
  footerMetaText: { color: colors.textSecondary, fontSize: 12, marginLeft: 4 },
  dot: { color: colors.textMuted, marginHorizontal: 6 },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  continueBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  completedBtn: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  completedBtnText: { color: colors.success, fontSize: 12, fontWeight: "bold" },
  enrollBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  enrollBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
