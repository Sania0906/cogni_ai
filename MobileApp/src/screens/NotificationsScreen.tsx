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
import { colors } from "../theme/colors";
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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              colors={[colors.primary]}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Bell color={colors.textMuted} size={40} />
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
                <View style={[styles.iconBox, item.read && { backgroundColor: colors.disabledBg }]}>
                  <Bell color={item.read ? colors.textMuted : colors.primary} size={18} />
                </View>
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
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  readCard: { backgroundColor: colors.backgroundSecondary, opacity: 0.8 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  readText: { color: colors.textSecondary },
  itemMessage: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  dateText: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  emptyBox: { alignItems: "center", marginTop: 80 },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "700", marginTop: 12 },
  emptySubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
});
