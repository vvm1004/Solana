"use client";

import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import { Center, Flex, List, Spinner, Text } from "@chakra-ui/react";
import { IdlAccounts } from "@coral-xyz/anchor";
import { useQuery } from "@tanstack/react-query";
import { TodoApp } from "../../../target/types/todo_app";
import TodoItem from "./todo-item";

export default function TodoList({
  profile,
}: {
  profile: IdlAccounts<TodoApp>["profile"];
}) {
  const provider = useAnchorProvider();

  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos", profile.key.toBase58(), profile.todoCount],
    enabled: !!profile,
    queryFn: () => new TodoProgram(provider).fetchTodos(profile),
  });

  if (isLoading) {
    return (
      <Center as={Flex} direction="column" gap={4} py={8}>
        <Spinner size="xl" colorScheme="blue" />
        <Text>Loading...</Text>
      </Center>
    );
  }

  console.log("todos", todos?.length);

  return (
    <List>
      {todos?.map((todo, idx) => (
        <TodoItem
          key={idx}
          index={idx}
          content={todo.content}
          completed={todo.completed}
          profileKey={profile.key}
          onDelete={() => window.location.reload()} // hoặc trigger refetch query
        />))}
    </List>
  );
}
