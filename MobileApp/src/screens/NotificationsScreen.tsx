import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { api } from "../services/api";
import { Bell, CheckCircle } from "lucide-react-native";

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      const list = Array.isArray(data) ? data : data?.data || [];
      setNotifications(list);
    } catch (e) {
      console.warn("Notification load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.warn("Failed to mark read:", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications & Alerts</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Bell color="#64748b" size={36} />
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySubtitle}>No pending alerts or notifications at this time.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.read && styles.readCard]}
              onPress={() => item.id && handleMarkRead(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.row}>
                <Bell color={item.read ? "#64748b" : "#6366f1"} size={20} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.itemTitle, item.read && styles.readText]}>
                    {item.title || "Notification"}
                  </Text>
                  <Text style={styles.itemMessage}>{item.message}</Text>
                  {item.created_at && (
                    <Text style={styles.dateText}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16", padding: 16 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10, marginBottom: 16 },
  card: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  readCard: { backgroundColor: "#0f172a", opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  itemTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  readText: { color: "#94a3b8" },
  itemMessage: { color: "#cbd5e1", fontSize: 13, marginTop: 4, lineHeight: 18 },
  dateText: { color: "#64748b", fontSize: 11, marginTop: 6 },
  emptyBox: { alignItems: "center", marginTop: 80 },
  emptyTitle: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginTop: 12 },
  emptySubtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },
});
