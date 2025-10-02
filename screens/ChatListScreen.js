import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ChatListScreen({ navigation }) {
  const [recentUsers, setRecentUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');
  const currentUser = auth.currentUser;

  // ✅ Listen to chats where current user is a participant
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.uid;

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('lastTime', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let chats = [];
      for (let chatDoc of snapshot.docs) {
        const data = chatDoc.data();

        if (data.users?.includes(userId)) {
          const otherUserId = data.users.find((id) => id !== userId);
          const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
          if (otherUserSnap.exists()) {
            chats.push({
              id: otherUserId,
              ...otherUserSnap.data(),
              lastMessage: data.lastMessage || '',
              lastTime: data.lastTime || null,
              unreadCount: data.unread?.[userId] || 0, // ✅ unread count
            });
          }
        }
      }
      setRecentUsers(chats);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async (text) => {
    setSearch(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (user) =>
          user.id !== currentUser.uid &&
          user.username?.toLowerCase().includes(text.toLowerCase())
      );
    setSearchResults(users);
  };

  const openChat = (otherUser) => {
    const chatId = [currentUser.uid, otherUser.id].sort().join('_');
    navigation.navigate('ChatRoom', {
      chatId,
      otherUser,
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => openChat(item)}>
      <View style={styles.userRow}>
        <Text style={styles.username}>{item.username}</Text>
        <View style={styles.rightSide}>
          {item.lastTime && (
            <Text style={styles.time}>
              {new Date(item.lastTime.toDate()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
      {item.lastMessage ? (
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      ) : (
        <Text style={styles.email}>{item.email}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with Logout */}
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search username to start new chat"
        value={search}
        onChangeText={handleSearch}
      />

      {/* Show either search results OR recent chats */}
      <FlatList
        data={search ? searchResults : recentUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  userItem: {
    padding: 15,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 13, color: '#555' },
  lastMsg: { fontSize: 13, color: '#333', fontStyle: 'italic' },
  time: { fontSize: 12, color: '#999' },
  rightSide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#ff4d4d',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
