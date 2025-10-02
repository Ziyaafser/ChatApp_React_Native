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
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ChatListScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const currentUser = auth.currentUser;

  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);

  // ✅ Load current user's Firestore profile
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setCurrentUserData(userSnap.data());
      }
    };

    fetchUserData();
  }, [currentUser]);

  // ✅ Load chats from Firestore
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
            const otherUser = otherUserSnap.data();
            chats.push({
              id: otherUserId,
              name: otherUser.username || 'Unknown',
              avatar: otherUser.avatar || null,
              lastMessage: data.lastMessage || '',
              lastTime: data.lastTime || null,
              unreadCount: data.unread?.[userId] || 0,
            });
          }
        }
      }
      setConversations(chats);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Search users
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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBg }]}
      onPress={() => openChat(item)}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />
      )}
      <View style={styles.middle}>
        <Text style={[styles.name, { color: theme.primaryText }]}>
          {item.name}
        </Text>
        <Text
          style={[styles.message, { color: theme.secondaryText }]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      <View style={styles.right}>
        {item.lastTime && (
          <Text style={[styles.time, { color: theme.secondaryText }]}>
            {new Date(item.lastTime.toDate()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={styles.navbar}>
        <Text style={[styles.title, { color: theme.primaryText }]}>
          Messages
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Add Button */}
          <TouchableOpacity style={{ marginRight: 15 }}>
            <Text style={{ color: theme.accent, fontSize: 22 }}>＋</Text>
          </TouchableOpacity>

          {/* Profile Icon */}
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')}>
            {currentUserData?.avatar ? (
              <Image
                source={{ uri: currentUserData.avatar }}
                style={styles.profileIcon}
              />
            ) : (
              <Image
                source={{ uri: 'https://img.icons8.com/ios-filled/50/000000/user-male-circle.png' }}
                style={styles.profileIcon}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Box */}
      <TextInput
        placeholder="Search"
        placeholderTextColor={theme.secondaryText}
        style={[
          styles.search,
          { borderColor: theme.secondaryText, color: theme.primaryText },
        ]}
        value={search}
        onChangeText={handleSearch}
      />

      {/* Conversations */}
      {conversations.length > 0 || searchResults.length > 0 ? (
        <FlatList
          data={search ? searchResults : conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={{ color: theme.secondaryText }}>No messages yet</Text>
        </View>
      )}
    </View>
  );
}

const lightTheme = {
  background: '#FFFFFF',
  primaryText: '#000000',
  secondaryText: '#999999',
  accent: '#3483FA',
  cardBg: '#FFFFFF',
};

const darkTheme = {
  background: '#121212',
  primaryText: '#FFFFFF',
  secondaryText: '#BBBBBB',
  accent: '#3483FA',
  cardBg: '#121212',
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  search: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
    paddingHorizontal: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#aaa',
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  middle: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  message: { fontSize: 14 },
  right: { alignItems: 'flex-end' },
  time: { fontSize: 12 },
  badge: {
    backgroundColor: '#ff4d4d',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
