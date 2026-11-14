import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Sparkles, AlertCircle, RotateCcw } from "lucide-react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
};

const STARTER_TOPICS = [
  "How do I improve ATS score?",
  "What skills should I learn?",
  "What jobs fit my profile?",
  "Suggest a learning path",
];

export function AIAssistantScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const name = user?.name || "there";
    setMessages([
      {
        id: "initial-greeting",
        role: "ai",
        text: `Hi ${name}! I'm your CognifyAI Career Assistant. How can I assist you with your career goals, resume, or skills today?`,
      },
    ]);
  }, [user]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await api.sendChatMessage(trimmed);
      const aiReply = response?.reply || "I am analyzing your career profile. Please let me know what questions you have!";

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: aiReply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.warn("AI Assistant request error:", err);
      const isOffline = !err.response;
      const errorText = isOffline
        ? "Unable to connect to the CognifyAI server. Please verify your network connection and try again."
        : (err?.response?.data?.message || "I ran into a problem communicating with the AI. Please try again.");

      setErrorMsg(errorText);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "ai",
          text: errorText,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={styles.innerContainer}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            loading ? (
              <View style={styles.thinkingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.thinkingText}>CognifyAI is thinking...</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            return (
              <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
                  {!isUser && (
                    <View style={styles.aiLabelRow}>
                      <Sparkles color={colors.primary} size={14} />
                      <Text style={styles.aiLabelText}>CognifyAI</Text>
                    </View>
                  )}
                  <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Suggested Topics / Starters */}
        {messages.length <= 2 && (
          <View style={styles.startersContainer}>
            <Text style={styles.startersHeader}>SUGGESTED TOPICS</Text>
            <View style={styles.startersRow}>
              {STARTER_TOPICS.map((topic, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.starterChip}
                  onPress={() => handleSend(topic)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.starterChipText}>{topic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Error notification banner if applicable */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <AlertCircle color={colors.destructive} size={16} />
            <Text style={styles.errorBannerText} numberOfLines={2}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}>
              <RotateCcw color={colors.destructive} size={14} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about resume, skills, or career goals..."
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!loading}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Send color="#ffffff" size={18} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  innerContainer: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 10 },
  bubbleWrapper: { marginBottom: 14, width: "100%" },
  userWrapper: { alignItems: "flex-end" },
  aiWrapper: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "85%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  aiLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  aiLabelText: { color: colors.primary, fontWeight: "700", fontSize: 12, marginLeft: 4 },
  messageText: { fontSize: 14, lineHeight: 21 },
  userText: { color: "#ffffff", fontWeight: "500" },
  aiText: { color: colors.textPrimary },
  thinkingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 4,
  },
  thinkingText: { color: colors.textSecondary, fontSize: 13, marginLeft: 8, fontWeight: "600" },
  startersContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  startersHeader: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  startersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  starterChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  starterChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: "600" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.destructiveBg,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
  },
  errorBannerText: { color: colors.destructive, fontSize: 12, flex: 1, marginHorizontal: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: colors.cardBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
});
