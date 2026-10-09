import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarImage from '../../components/AvatarImage';
import { Colors } from '../../constants/Colors';
import { Fonts, Spacing } from '../../constants/theme';
import { useGroupStore } from '../../lib/groupStore';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';

export default function NewDMScreen() {
  const router = useRouter();
  const { createDM, fetchDMs } = useGroupStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', `%${query.trim()}%`)
        .neq('id', user?.id || '')
        .limit(20);
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (user: Profile) => {
    setCreating(user.id);
    await fetchDMs();
    const { error, group } = await createDM(user.id);
    setCreating(null);
    if (!error && group) {
      router.replace(`/dm/${group.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.textPrimary} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
      </View>

      <View style={styles.searchBar}>
        <Search color={Colors.textMuted} size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {loading && <ActivityIndicator size="small" color={Colors.accent} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => handleSelect(item)}
            disabled={!!creating}
          >
            <AvatarImage
              size={44}
              name={item.name || item.email}
              avatarUrl={item.avatar_url}
              style={{ marginRight: Spacing.lg }}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name || item.email.split('@')[0]}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            {creating === item.id && <ActivityIndicator size="small" color={Colors.accent} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found for "{query}"</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    margin: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: Colors.textPrimary },
  listContent: { paddingHorizontal: Spacing.lg },
  userRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  userInfo: { flex: 1 },
  userName: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.textPrimary },
  userEmail: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xxs },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxxl },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted },
});
