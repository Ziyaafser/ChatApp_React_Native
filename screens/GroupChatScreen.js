import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { auth, db } from '../firebase';

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const currentUser = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [currentUserName, setCurrentUserName] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const flatListRef = useRef(null);
  const [groupAvatar, setGroupAvatar] = useState('');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const COLORS = {
    background: isDark ? '#121212' : '#FFFFFF',
    myBubble: isDark ? '#005c4b' : '#DCF8C6',
    otherBubble: isDark ? '#262626' : '#F1F1F1',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#BBBBBB' : '#999999',
    dividerBg: isDark ? '#2A2A2A' : '#DDDDDD',
    dividerText: isDark ? '#CCCCCC' : '#444444',
    inputBg: isDark ? '#1E1E1E' : '#F0F0F0',
    inputBorder: isDark ? '#333333' : '#CCCCCC',
    mention: '#3483FA',
    mentionBoxBg: isDark ? '#1E1E1E' : '#FFFFFF',
    mentionItemBorder: isDark ? '#333333' : '#EEEEEE',
  };

  useEffect(() => {
    const fetchUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setCurrentUserName(userDoc.data().username || 'Unknown');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'groups', groupId), async (groupDoc) => {
      if (groupDoc.exists()) {
        const { members, avatar } = groupDoc.data();
        setGroupAvatar(avatar || '');
        setGroupMembers(members || []);

        const users = {};
        for (const uid of members) {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            const data = snap.data();
            users[uid] = data.fullName || data.username || 'User'; // Prioritize fullName
          }
        }
        setUserMap(users);

        // Set header
        const usernames = Object.values(users);
        let displayNames = usernames.slice(0, 2).join(', ');
        if (usernames.length > 2) displayNames += ' and more';

        navigation.setOptions({
          headerTitle: '',
          headerStyle: { backgroundColor: '#3483FA' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10 }}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => navigation.navigate('GroupInfo', { groupId })}
              >
                <Image
                  source={{
                    uri: avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 10,
                  }}
                />
                <View style={{ flexShrink: 1 }}>
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 17,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                  >
                    {groupName}
                  </Text>
                  <Text
                    style={{
                      color: '#eee',
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {displayNames}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ),
        });
      }
    });

    return unsubscribe;
  }, [groupId, navigation]);

  useEffect(() => {
    const markAsRead = async () => {
      const groupRef = doc(db, 'groups', groupId);
      const snap = await getDoc(groupRef);
      if (snap.exists()) {
        const unread = { ...(snap.data().unread || {}) };
        unread[currentUser.uid] = 0;
        await setDoc(groupRef, { unread }, { merge: true });
      }
    };
    markAsRead();
  }, [groupId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = {
      text: input.trim(),
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'groups', groupId, 'messages'), newMessage);

    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    const unreadMap = { ...(groupSnap.data()?.unread || {}) };
    groupMembers.forEach((uid) => {
      if (uid !== currentUser.uid) {
        unreadMap[uid] = (unreadMap[uid] || 0) + 1;
      }
    });

    await setDoc(
      groupRef,
      {
        lastMessage: input.trim(),
        lastSenderId: currentUser.uid,
        lastSenderName: currentUserName,
        lastTime: serverTimestamp(),
        unread: unreadMap,
      },
      { merge: true }
    );

    setInput('');
  };

  const handleMentionDetection = (text) => {
    setInput(text);
    const mentionMatch = text.match(/@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const matches = Object.values(userMap).filter((u) =>
        u.toLowerCase().startsWith(query)
      );
      setMentionSuggestions(matches);
    } else {
      setMentionSuggestions([]);
    }
  };

  const handleMentionSelect = (username) => {
    setMentionSuggestions([]);
    setInput((prev) => prev.replace(/@(\w*)$/, `@${username} `));
  };

  const formatMessageWithMentions = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <Text key={idx} style={{ fontWeight: 'bold', color: COLORS.mention }}>
            {part}
          </Text>
        );
      }
      return (
        <Text key={idx} style={{ color: COLORS.text }}>
          {part}
        </Text>
      );
    });
  };

  let lastDate = null;

  const onLongPressMessage = (item) => {
    Alert.alert('Message Options', '', [
      {
        text: 'Copy',
        onPress: () => {
          Clipboard.setStringAsync(item.text);
          ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'groups', groupId, 'messages', item.id));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUser.uid;
    const messageDate = item.createdAt?.toDate?.();
    const dateLabel = messageDate?.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const showDate = dateLabel !== lastDate;
    if (showDate) lastDate = dateLabel;

    return (
      <>
        {showDate && (
          <View
            style={[styles.dateDivider, { backgroundColor: COLORS.dividerBg }]}
          >
            <Text
              style={[styles.dateDividerText, { color: COLORS.dividerText }]}
            >
              {dateLabel}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onLongPress={() => onLongPressMessage(item)}
          activeOpacity={0.8}
          style={[
            styles.messageBubble,
            {
              backgroundColor: isMe ? COLORS.myBubble : COLORS.otherBubble,
              alignSelf: isMe ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {!isMe && (
            <Text style={{ fontWeight: 'bold', marginBottom: 3, color: COLORS.text }}>
              {userMap[item.senderId] || 'User'}
            </Text>
          )}
          <Text style={{ fontSize: 15 }}>{formatMessageWithMentions(item.text)}</Text>
          <Text style={[styles.timestamp, { color: COLORS.secondaryText }]}>
            {messageDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ||
              '...'}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Mention Suggestions */}
        {mentionSuggestions.length > 0 && (
          <View
            style={[
              styles.mentionBox,
              { backgroundColor: COLORS.mentionBoxBg },
            ]}
          >
            {mentionSuggestions.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => handleMentionSelect(u)}
                style={[
                  styles.mentionItem,
                  { borderColor: COLORS.mentionItemBorder },
                ]}
              >
                <Text style={{ color: COLORS.text }}>@{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { borderColor: COLORS.inputBorder, backgroundColor: COLORS.inputBg },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: COLORS.inputBg, color: COLORS.text },
            ]}
            placeholder="Type a message"
            placeholderTextColor={COLORS.secondaryText}
            value={input}
            onChangeText={handleMentionDetection}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <MaterialIcons name="send" size={20} color="#3483FA" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    maxWidth: '70%',
    marginHorizontal: 5,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  dateDivider: {
    alignSelf: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 10,
  },
  dateDividerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  mentionBox: {
    borderTopWidth: 1,
    maxHeight: 120,
  },
  mentionItem: {
    padding: 10,
    borderBottomWidth: 1,
  },
});
