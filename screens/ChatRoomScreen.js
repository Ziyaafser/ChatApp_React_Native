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
  useColorScheme,
  View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, otherUser } = route.params;
  const currentUser = auth.currentUser;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sendingStatus, setSendingStatus] = useState({});
  const [otherFullName, setOtherFullName] = useState('');
  const [otherAvatar, setOtherAvatar] = useState('');
  const flatListRef = useRef(null);
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  const COLORS = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#BBBBBB' : '#999999',
    myBubble: '#DCF8C6',
    otherBubble: '#F1F1F1',
  };

  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        const userRef = doc(db, 'users', otherUser.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const name = data.fullName || otherUser.username || 'Chat';
          const avatarUrl =
            data.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
          setOtherFullName(name);
          setOtherAvatar(avatarUrl);

          navigation.setOptions({
            headerTitle: '',
            headerLeft: () => (
              <View style={styles.headerLeftContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
                <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              </View>
            ),
          });
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };

    fetchOtherUser();
  }, [navigation, otherUser]);

  useEffect(() => {
    const resetUnread = async () => {
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, {
        unread: { [currentUser.uid]: 0 }
      }, { merge: true });
    };
    resetUnread();
  }, [chatId]);

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMsg = {
      text: message.trim(),
      senderId: currentUser.uid,
      senderEmail: currentUser.email,
      timestamp: serverTimestamp(),
    };

    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), newMsg);
    setSendingStatus(prev => ({ ...prev, [msgRef.id]: 'sending' }));

    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    const chatData = chatSnap.exists() ? chatSnap.data() : {};

    await setDoc(chatRef, {
      users: [currentUser.uid, otherUser.id],
      lastMessage: newMsg.text,
      lastTime: serverTimestamp(),
      lastSender: currentUser.uid,
      unread: {
        [currentUser.uid]: 0,
        [otherUser.id]: (chatData?.unread?.[otherUser.id] || 0) + 1,
      }
    }, { merge: true });

    setMessage('');
  };

  const renderStatusIcon = (msgId, ts) => {
    if (!ts) return <Ionicons name="time-outline" size={12} color="#999" />;
    if (sendingStatus[msgId] === 'failed')
      return <Ionicons name="close-circle-outline" size={12} color="red" />;
    return <Ionicons name="checkmark-done-outline" size={12} color="#999" />;
  };

  let lastDate = null;

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUser.uid;
    const messageDate = item.timestamp?.toDate?.();
    const dateLabel = messageDate
      ? messageDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : null;

    const showDateDivider = dateLabel !== lastDate;
    if (showDateDivider) lastDate = dateLabel;

    const onLongPress = () => {
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
            await deleteDoc(doc(db, 'chats', chatId, 'messages', item.id));
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    };

    return (
      <>
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateDividerText}>{dateLabel}</Text>
          </View>
        )}

        <TouchableOpacity
          onLongPress={onLongPress}
          activeOpacity={0.8}
          style={[
            styles.messageBubble,
            {
              backgroundColor: isMe ? COLORS.myBubble : COLORS.otherBubble,
              alignSelf: isMe ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          <Text style={[styles.messageText, { color: COLORS.text }]}>{item.text}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timestamp, { color: COLORS.secondaryText }]}>
              {item.timestamp?.toDate
                ? new Date(item.timestamp.toDate()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '...'}
            </Text>
            {isMe && renderStatusIcon(item.id, item.timestamp)}
          </View>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            style={{ flex: 1, paddingHorizontal: 10 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              flatListRef.current.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current.scrollToEnd({ animated: true })
            }
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#2a2a2a' : '#eeeeee',
                  color: COLORS.text,
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message..."
              placeholderTextColor={COLORS.secondaryText}
              multiline
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <MaterialIcons name="send" size={20} color="#3483FA" />
            </TouchableOpacity>
          </View>
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
    marginHorizontal: 10, // ✅ horizontal spacing from screen edges
  },
  messageText: {
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 1,
    gap: 5,
  },
  timestamp: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  dateDivider: {
    alignSelf: 'center',
    backgroundColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 10,
  },
  dateDividerText: {
    fontSize: 12,
    color: '#444',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
  },
  backButton: {
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    maxWidth: 180,
  },
});
