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
import { useEffect, useState } from 'react';
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

export default function GroupChatScreen({ route }) {
  const { groupId, groupName } = route.params;
  const currentUser = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [currentUserName, setCurrentUserName] = useState('');

  // Get current user's username
  useEffect(() => {
    const fetchUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setCurrentUserName(userDoc.data().username || 'Unknown');
      }
    };
    fetchUser();
  }, []);

  // Listen to messages
  useEffect(() => {
    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    return unsubscribe;
  }, [groupId]);

  // Fetch group members
  useEffect(() => {
    const fetchMembers = async () => {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const data = groupDoc.data();
        setGroupMembers(data.members || []);
      }
    };
    fetchMembers();
  }, [groupId]);

  useEffect(() => {
  if (!currentUser) return; // ✅ safety check

  const markAsRead = async () => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const unreadMap = { ...(groupData.unread || {}) };
        unreadMap[currentUser.uid] = 0; // reset only for this user

        await setDoc(groupRef, { unread: unreadMap }, { merge: true });
      }
    } catch (error) {
      console.log('Error resetting unread:', error);
    }
  };

  markAsRead(); // ✅ call async inside effect
}, [groupId, currentUser]);


  const sendMessage = async () => {
  if (!input.trim()) return;

  const newMessage = {
    text: input,
    senderId: currentUser.uid,
    createdAt: serverTimestamp(),
  };

  // Add message to subcollection
  await addDoc(collection(db, 'groups', groupId, 'messages'), newMessage);

  // Update group metadata
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  const currentUnread = groupSnap.exists() ? groupSnap.data().unread || {} : {};

  const unreadMap = { ...currentUnread };
  groupMembers.forEach((id) => {
    if (id !== currentUser.uid) {
      unreadMap[id] = (unreadMap[id] || 0) + 1;
    }
  });

  await setDoc(
    groupRef,
    {
      lastMessage: input,
      lastSenderId: currentUser.uid,
      lastSenderName: currentUserName,
      lastTime: serverTimestamp(),  // ✅ use serverTimestamp
      unread: unreadMap,
    },
    { merge: true }
  );

  setInput('');
};


  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.senderId === currentUser.uid
          ? styles.myMessage
          : styles.otherMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Chat messages */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 10 }}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  myMessage: {
    backgroundColor: '#DCF8C5',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#F1F0F0',
    alignSelf: 'flex-start',
  },
  messageText: { fontSize: 16 },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#3483FA',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendText: { color: '#fff', fontWeight: 'bold' },
});
