import { MaterialIcons } from '@expo/vector-icons';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { auth, db } from '../firebase';

export default function ChatListScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const currentUser = auth.currentUser;

  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showAddOptions, setShowAddOptions] = useState(false);

  const searchInputRef = useRef(null);

  // ✅ load current user data
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

  // ✅ live chats + groups
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.uid;

    // --- listen for 1-to-1 chats
    const chatsRef = collection(db, 'chats');
    const unsubscribeChats = onSnapshot(
      query(chatsRef, orderBy('lastTime', 'desc')),
      async (snapshot) => {
        let newChats = [];
        for (let chatDoc of snapshot.docs) {
          const data = chatDoc.data();
          if (data.users?.includes(userId)) {
            const otherUserId = data.users.find((id) => id !== userId);
            const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
            if (otherUserSnap.exists()) {
              const otherUser = otherUserSnap.data();
              newChats.push({
                id: otherUserId,
                type: 'user',
                username: otherUser.username || '',
                fullName: otherUser.fullName || '',
                avatar: otherUser.avatar || null,
                lastMessage: data.lastMessage || '',
                lastTime: data.lastTime || null,
                unreadCount: data.unread?.[userId] || 0,
                pinned: data.pinned || false,
              });
            }
          }
        }

        setConversations((prev) => {
          const groupsOnly = prev.filter((c) => c.type === 'group');
          return [...newChats, ...groupsOnly].sort(sortChats);
        });
      }
    );

    // --- listen for group chats
    const groupsRef = collection(db, 'groups');
    const unsubscribeGroups = onSnapshot(groupsRef, async (groupSnap) => {
      let newGroups = [];
      for (let docSnap of groupSnap.docs) {
        const groupData = docSnap.data();
        if (groupData.members?.includes(userId)) {
          let senderName = '';
          if (groupData.lastSenderId) {
            const senderSnap = await getDoc(doc(db, 'users', groupData.lastSenderId));
            if (senderSnap.exists()) {
              senderName =
                senderSnap.data().fullName || senderSnap.data().username || 'Unknown';
            }
          }

          newGroups.push({
            id: docSnap.id,
            type: 'group',
            name: groupData.name,
            avatar: groupData.avatar || null,
            lastMessage: groupData.lastMessage
              ? `~${senderName}: ${groupData.lastMessage}`
              : '',
            lastTime: groupData.lastTime || null,
            unreadCount: groupData.unread?.[userId] || 0,
            pinned: groupData.pinned || false,
          });
        }
      }

      setConversations((prev) => {
        const usersOnly = prev.filter((c) => c.type === 'user');
        return [...usersOnly, ...newGroups].sort(sortChats);
      });
    });

    return () => {
      unsubscribeChats();
      unsubscribeGroups();
    };
  }, [currentUser]);

  // ✅ sort pinned first, then by lastTime
  const sortChats = (a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const aTime = a.lastTime?.toDate?.() ?? new Date(0);
    const bTime = b.lastTime?.toDate?.() ?? new Date(0);
    return bTime - aTime;
  };

  // ✅ search users + groups
  const handleSearch = async (text) => {
    setSearch(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    if (!currentUser) return;

    const [userSnap, groupSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'groups')),
    ]);

    const userMatches = userSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data(), type: 'user' }))
      .filter(
        (user) =>
          user.id !== currentUser.uid &&
          user.username?.toLowerCase().includes(text.toLowerCase())
      )
      .map((user) => ({
        id: user.id,
        type: 'user',
        username: user.username || '',
        fullName: user.fullName || '',
        avatar: user.avatar || null,
      }));

    const groupMatches = groupSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data(), type: 'group' }))
      .filter((group) =>
        group.name?.toLowerCase().includes(text.toLowerCase())
      )
      .map((group) => ({
        id: group.id,
        type: 'group',
        name: group.name,
        avatar: group.avatar || null,
      }));

    setSearchResults([...userMatches, ...groupMatches]);
  };

  const openChat = (otherUser) => {
    const chatId = [currentUser.uid, otherUser.id].sort().join('_');
    navigation.navigate('ChatRoom', {
      chatId,
      otherUser,
    });
  };

  // ✅ clear unread + navigate
  const handleOpenChat = (item, isGroup) => {
    if (!currentUser) return;

    if (isGroup) {
      const groupRef = doc(db, 'groups', item.id);
      getDoc(groupRef).then((snap) => {
        if (snap.exists()) {
          const unreadMap = { ...(snap.data().unread || {}) };
          unreadMap[currentUser.uid] = 0;
          setDoc(groupRef, { unread: unreadMap }, { merge: true });
        }
      });

      navigation.navigate('GroupChat', {
        groupId: item.id,
        groupName: item.name,
      });
    } else {
      const chatId = [currentUser.uid, item.id].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      getDoc(chatRef).then((snap) => {
        if (snap.exists()) {
          const unreadMap = { ...(snap.data().unread || {}) };
          unreadMap[currentUser.uid] = 0;
          setDoc(chatRef, { unread: unreadMap }, { merge: true });
        }
      });

      openChat(item);
    }
  };

  // ✅ toggle pin
  const togglePin = async (item) => {
    try {
      if (item.type === 'group') {
        await setDoc(doc(db, 'groups', item.id), { pinned: !item.pinned }, { merge: true });
      } else {
        const chatId = [currentUser.uid, item.id].sort().join('_');
        await setDoc(doc(db, 'chats', chatId), { pinned: !item.pinned }, { merge: true });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pin/unpin chat');
    }
  };

  // ✅ delete conversation
  const deleteConversation = async (item) => {
    try {
      if (item.type === 'group') {
        const groupRef = doc(db, 'groups', item.id);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const data = groupSnap.data();
          const updatedMembers = (data.members || []).filter(
            (id) => id !== currentUser.uid
          );
          await setDoc(groupRef, { members: updatedMembers }, { merge: true });
        }
      } else {
        const chatId = [currentUser.uid, item.id].sort().join('_');
        await deleteDoc(doc(db, 'chats', chatId));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to delete conversation');
      console.log('Delete error:', err);
    }
  };

  // ✅ render item with swipe to delete
  const renderItem = ({ item }) => {
    const isGroup = item.type === 'group';

    return (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteConversation(item)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.cardBg }]}
          onPress={() => handleOpenChat(item, isGroup)}
          onLongPress={() => togglePin(item)} // long press = pin/unpin
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ color: '#fff' }}>{isGroup ? '👥' : '👤'}</Text>
            </View>
          )}

          <View style={styles.middle}>
            <Text style={[styles.name, { color: theme.primaryText }]}>
              {isGroup ? item.name : item.fullName || 'Unknown Name'}
            </Text>

            {item.lastMessage ? (
              <Text
                style={[styles.message, { color: theme.secondaryText }]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            ) : !isGroup ? (
              <Text style={[styles.username, { color: theme.secondaryText }]}>
                @{item.username || 'username'}
              </Text>
            ) : null}
          </View>

          <View style={styles.right}>
            {item.lastTime && (
              <Text style={[styles.time, { color: theme.secondaryText }]}>
                {new Date(
                  item.lastTime?.toDate ? item.lastTime.toDate() : item.lastTime
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}

            {item.pinned && (
              <MaterialIcons
                name="push-pin"
                size={18}
                color="#999"
                style={{ marginTop: 4 }}
              />
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
      </Swipeable>
    );
  };

  // ✅ apply filter
  let dataToRender = search ? searchResults : conversations;
  if (filter === 'contacts') {
    dataToRender = dataToRender.filter((item) => item.type === 'user');
  } else if (filter === 'groups') {
    dataToRender = dataToRender.filter((item) => item.type === 'group');
  }                 
    
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.navbar}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Messages</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ marginRight: 15 }}
            onPress={() => setShowAddOptions(!showAddOptions)}
          >
            <Text style={{ color: theme.accent, fontSize: 22 }}>＋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')}>
            {currentUserData?.avatar ? (
              <Image
                source={{ uri: currentUserData.avatar }}
                style={styles.profileIcon}
              />
            ) : (
              <Image
                source={{
                  uri: 'https://img.icons8.com/ios-filled/50/000000/user-male-circle.png',
                }}
                style={styles.profileIcon}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        ref={searchInputRef}
        placeholder="Search users or groups"
        placeholderTextColor={theme.secondaryText}
        style={[
          styles.search,
          { borderColor: theme.secondaryText, color: theme.primaryText },
        ]}
        value={search}
        onChangeText={handleSearch}
      />

      {/* filter tabs */}
     <View style={styles.filterRow}>
      {['all', 'contacts', 'groups'].map((type) => {
        const isActive = filter === type;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => setFilter(type)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: isActive ? theme.filterActiveBg : theme.filterBg,
                borderColor: theme.filterBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: isActive ? theme.filterActiveText : theme.filterText,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {type === 'contacts'
                ? 'Contacts'
                : type === 'groups'
                ? 'Groups'
                : 'All'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

      {dataToRender.length > 0 ? (
        <FlatList
          data={dataToRender}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={{ color: theme.secondaryText }}>No messages yet</Text>
        </View>
      )}

     {showAddOptions && (
      <View
        style={[
          styles.dropdownOptions,
          {
            backgroundColor: theme.dropdownBg,
            borderColor: theme.dropdownBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => {
            setFilter('contacts');
            setSearch('');
            setShowAddOptions(false);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
        >
          <Text style={[styles.modalButtonText, { color: theme.dropdownText }]}>
            🔍  Search user by username
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => {
            setShowAddOptions(false);
            navigation.navigate('CreateGroup');
          }}
        >
          <Text style={[styles.modalButtonText, { color: theme.dropdownText }]}>
            👥  Create group
          </Text>
        </TouchableOpacity>
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
  filterBg: '#FFFFFF',
  filterBorder: '#ccc',
  filterActiveBg: '#3483FA',
  filterActiveText: '#FFFFFF',
  filterText: '#666',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
  dropdownBorder: '#ccc',
};

const darkTheme = {
  background: '#121212',
  primaryText: '#FFFFFF',
  secondaryText: '#BBBBBB',
  accent: '#3483FA',
  cardBg: '#1E1E1E',
  filterBg: '#1E1E1E',
  filterBorder: '#333333',
  filterActiveBg: '#3483FA',
  filterActiveText: '#FFFFFF',
  filterText: '#BBBBBB',
  dropdownBg: '#1E1E1E',
  dropdownText: '#FFFFFF',
  dropdownBorder: '#333333',

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
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: '#3483FA',
    backgroundColor: '#3483FA',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#aaa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  middle: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  username: { fontSize: 13, fontStyle: 'italic' },
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
  dropdownOptions: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 4,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 5,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButton: { paddingVertical: 10 },
  modalButtonText: { fontSize: 15, color: '#000000ff',fontWeight: 'bold' },
});
