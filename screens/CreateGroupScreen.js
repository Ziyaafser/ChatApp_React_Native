import {
    addDoc,
    collection,
    getDocs,
    serverTimestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userList = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.id !== currentUser.uid);
      setUsers(userList);
    };

    fetchUsers();
  }, []);

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Enter group name');
      return;
    }
    if (selectedUserIds.length === 0) {
      Alert.alert('Select at least one member');
      return;
    }

    const newGroup = {
      name: groupName.trim(),
      members: [currentUser.uid, ...selectedUserIds],
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      avatar: '', // Optional: Add avatar logic later
    };

    try {
      await addDoc(collection(db, 'groups'), newGroup);
      Alert.alert('Group created!');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error creating group');
    }
  };

  const renderUser = ({ item }) => {
    const isSelected = selectedUserIds.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => toggleUserSelection(item.id)}
        style={[styles.userCard, isSelected && styles.selectedCard]}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={{ color: '#fff' }}>👤</Text>
          </View>
        )}
        <Text style={styles.name}>{item.fullName || 'Unnamed'}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create New Group</Text>

      <TextInput
        placeholder="Enter group name"
        value={groupName}
        onChangeText={setGroupName}
        style={styles.input}
      />

      <Text style={styles.subheading}>Select Members</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.button} onPress={handleCreateGroup}>
        <Text style={styles.buttonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  subheading: { fontSize: 16, marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
  },
  selectedCard: {
    backgroundColor: '#e6f0ff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  placeholder: {
    backgroundColor: '#aaa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 16, flex: 1 },
  username: { fontSize: 13, color: '#888' },
  button: {
    backgroundColor: '#3483FA',
    paddingVertical: 12,
    borderRadius: 8,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
