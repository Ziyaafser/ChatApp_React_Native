// screens/ChatRoomScreen.js
import {
    addDoc,
    collection,
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
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ChatRoomScreen({ route }) {
  const { chatId, otherUser } = route.params;
  const currentUser = auth.currentUser;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const flatListRef = useRef(null);

  // ✅ Reset unread count when entering this chat
  useEffect(() => {
    const resetUnread = async () => {
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(
        chatRef,
        {
          unread: {
            [currentUser.uid]: 0,
          },
        },
        { merge: true }
      );
    };
    resetUnread();
  }, [chatId]);

  // ✅ Listen to all messages in this chat
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [chatId]);

  // ✅ Send a message and update chat preview + unread
  const sendMessage = async () => {
    if (!message.trim()) return;

    // Save message in messages subcollection
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: message,
      senderId: currentUser.uid,
      senderEmail: currentUser.email,
      timestamp: serverTimestamp(),
    });

    // Fetch current chat data for unread counts
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    const chatData = chatSnap.exists() ? chatSnap.data() : {};

    // Update chat doc with preview + unread increment
    await setDoc(
      chatRef,
      {
        users: [currentUser.uid, otherUser.id],
        lastMessage: message,
        lastTime: serverTimestamp(),
        lastSender: currentUser.uid,
        unread: {
          [currentUser.uid]: 0, // reset for sender
          [otherUser.id]: (chatData?.unread?.[otherUser.id] || 0) + 1, // increment for receiver
        },
      },
      { merge: true }
    );

    setMessage('');
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUser.uid;
    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.sender}>{isMe ? 'You' : otherUser.username}</Text>
        <Text>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onContentSizeChange={() =>
          flatListRef.current.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messageBubble: {
    margin: 8,
    padding: 10,
    borderRadius: 10,
    maxWidth: '75%',
  },
  myMessage: { backgroundColor: '#DCF8C5', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#E2E2E2', alignSelf: 'flex-start' },
  sender: { fontSize: 10, color: '#555', marginBottom: 3 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    paddingHorizontal: 15,
  },
  sendButton: { justifyContent: 'center', paddingHorizontal: 15 },
  sendText: { color: '#007AFF', fontWeight: 'bold' },
});
