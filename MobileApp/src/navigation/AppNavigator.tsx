import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";

// Import Screens
import { LoginScreen } from "../screens/LoginScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { UserDashboardScreen } from "../screens/UserDashboardScreen";
import { OrganizationDashboardScreen } from "../screens/OrganizationDashboardScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { ResumeUploadScreen } from "../screens/ResumeUploadScreen";
import { ResumeHistoryScreen } from "../screens/ResumeHistoryScreen";
import { SkillGapScreen } from "../screens/SkillGapScreen";
import { CompanyReadinessScreen } from "../screens/CompanyReadinessScreen";
import { CareerTwinScreen } from "../screens/CareerTwinScreen";
import { AIInterviewScreen } from "../screens/AIInterviewScreen";
import { LearningRoadmapScreen } from "../screens/LearningRoadmapScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { SettingsScreen, ProfileScreen } from "../screens/SettingsScreen";
import { JobsScreen } from "../screens/JobsScreen";
import { SavedJobsScreen } from "../screens/SavedJobsScreen";
import { CoursesScreen } from "../screens/CoursesScreen";
import { CourseDetailsScreen } from "../screens/CourseDetailsScreen";
import { LessonScreen } from "../screens/LessonScreen";

import { Home, Briefcase, GraduationCap, FileText, Settings } from "lucide-react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#090d16" },
        headerTintColor: "#ffffff",
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={UserDashboardScreen}
        options={{
          title: "Home",
          headerTitle: "CognifyAI Dashboard",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          title: "Jobs",
          headerTitle: "Explore Careers & Jobs",
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{
          title: "Courses",
          headerTitle: "Upskilling Catalog",
          tabBarIcon: ({ color, size }) => <GraduationCap color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Resume"
        component={ResumeUploadScreen}
        options={{
          title: "Resume",
          headerTitle: "AI ATS Optimization",
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerTitle: "Account & Preferences",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.splashCenter}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#090d16" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
          </>
        ) : user.role === "admin" ? (
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ title: "Admin Portal", headerShown: false }}
          />
        ) : user.role === "organization" ? (
          <Stack.Screen
            name="OrgDashboard"
            component={OrganizationDashboardScreen}
            options={{ title: "Organization Portal", headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={UserTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Edit Profile" }} />
            <Stack.Screen name="SavedJobs" component={SavedJobsScreen} options={{ title: "Saved Bookmarks" }} />
            <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: "Course Curriculum" }} />
            <Stack.Screen name="Lesson" component={LessonScreen} options={{ title: "Lesson Player" }} />
            <Stack.Screen name="ResumeHistory" component={ResumeHistoryScreen} options={{ title: "Audit History" }} />
            <Stack.Screen name="SkillGap" component={SkillGapScreen} options={{ title: "Skill Gap Analysis" }} />
            <Stack.Screen name="CompanyReadiness" component={CompanyReadinessScreen} options={{ title: "Company Readiness" }} />
            <Stack.Screen name="CareerTwin" component={CareerTwinScreen} options={{ title: "Career Twin Simulation" }} />
            <Stack.Screen name="AIInterview" component={AIInterviewScreen} options={{ title: "AI Mock Interview" }} />
            <Stack.Screen name="LearningRoadmap" component={LearningRoadmapScreen} options={{ title: "AI Learning Roadmap" }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashCenter: {
    flex: 1,
    backgroundColor: "#090d16",
    justifyContent: "center",
    alignItems: "center",
  },
});
